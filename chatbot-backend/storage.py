"""Async read-only catalog and atomic shared quotas, using separate credentials."""
import hashlib
import hmac
import json

from pymongo import AsyncMongoClient, ReturnDocument
from pymongo.errors import DuplicateKeyError
from pymongo.write_concern import WriteConcern


class QuotaExceeded(Exception):
    pass


async def verify_privileges(client, database, collection, allowed_actions):
    status = await client.admin.command({'connectionStatus': 1, 'showPrivileges': True})
    privileges = status.get('authInfo', {}).get('authenticatedUserPrivileges', [])
    if not privileges:
        raise RuntimeError('Dedicated Mongo privileges could not be verified')
    for privilege in privileges:
        resource = privilege.get('resource', {})
        if resource != {'db': database, 'collection': collection} or not set(privilege.get('actions', [])).issubset(allowed_actions):
            raise RuntimeError('Mongo credentials exceed chatbot collection privileges')


class MongoCatalog:
    def __init__(self, settings):
        self.settings = settings
        self.client = AsyncMongoClient(settings.catalog_uri, serverSelectionTimeoutMS=3000, connectTimeoutMS=3000,
                                       socketTimeoutMS=3000, maxPoolSize=4, tls=(settings.environment == 'production'))
        self.collection = self.client[settings.catalog_db]['products']

    async def initialize(self):
        await self.client.admin.command('ping')
        if self.settings.environment == 'production':
            await verify_privileges(self.client, self.settings.catalog_db, 'products', {'find', 'killCursors'})

    async def names(self):
        # Slice in Mongo, before transport; never transfer arbitrary descriptions.
        cursor = await self.collection.aggregate([
            {'$match': {'name': {'$type': 'string'}}}, {'$limit': 20},
            {'$project': {'_id': 0, 'name': {'$substrCP': ['$name', 0, 80]}}},
        ], maxTimeMS=2000)
        return [document['name'] async for document in cursor]

    async def close(self):
        await self.client.close()


class MongoQuota:
    def __init__(self, settings):
        self.settings = settings
        self.client = AsyncMongoClient(settings.quota_uri, serverSelectionTimeoutMS=3000, connectTimeoutMS=3000,
                                       socketTimeoutMS=3000, maxPoolSize=4, tls=(settings.environment == 'production'))
        self.collection = self.client[settings.quota_db].get_collection('chat_quota', write_concern=WriteConcern('majority'))
        values = [settings.model, settings.token_parameter, settings.daily_requests, settings.daily_tokens, settings.daily_cost_microusd,
                  settings.input_microusd_per_token, settings.output_microusd_per_token]
        self.fingerprint = hashlib.sha256(json.dumps(values).encode()).hexdigest()

    async def initialize(self):
        await self.client.admin.command('ping')
        if self.settings.environment == 'production':
            await verify_privileges(self.client, self.settings.quota_db, 'chat_quota',
                                    {'find', 'insert', 'update', 'createIndex', 'listIndexes', 'killCursors'})
        await self.collection.create_index('expiresAt', expireAfterSeconds=0)

    async def _initialize_document(self, key):
        try:
            await self.collection.update_one({'_id': key}, {'$setOnInsert': {'count': 0}}, upsert=True)
        except DuplicateKeyError:
            pass  # Another process inserted it; subsequent reservation is atomic.

    async def reserve(self, address):
        address_hash = hmac.new(self.settings.quota_secret.encode(), address.encode(), hashlib.sha256).hexdigest()
        key = 'ip:' + address_hash
        await self._initialize_document(key)
        minute = {'$dateTrunc': {'date': '$$NOW', 'unit': 'minute', 'timezone': 'UTC'}}
        same_minute = {'$eq': [{'$ifNull': ['$minute', None]}, minute]}
        permitted = {'$or': [{'$not': [same_minute]}, {'$lt': ['$count', 5]}]}
        rate = await self.collection.find_one_and_update({'_id': key, '$expr': permitted}, [{'$set': {
            'minute': minute, 'count': {'$add': [{'$cond': [same_minute, '$count', 0]}, 1]},
            'expiresAt': {'$dateAdd': {'startDate': '$$NOW', 'unit': 'day', 'amount': 2}},
        }}], return_document=ReturnDocument.AFTER)
        if not rate:
            raise QuotaExceeded()

        await self._initialize_document('daily')
        day = {'$dateToString': {'date': '$$NOW', 'format': '%Y-%m-%d', 'timezone': 'UTC'}}
        same_day = {'$eq': [{'$ifNull': ['$day', None]}, day]}
        budget_ok = {'$and': [
            {'$eq': ['$config', self.fingerprint]},
            {'$lt': ['$requests', self.settings.daily_requests]},
            {'$lte': ['$tokens', self.settings.daily_tokens - self.settings.reserved_tokens]},
            {'$lte': ['$cost', self.settings.daily_cost_microusd - self.settings.reserved_cost]},
        ]}
        daily = await self.collection.find_one_and_update({'_id': 'daily', '$expr': {'$or': [{'$not': [same_day]}, budget_ok]}}, [{'$set': {
            'day': day, 'config': self.fingerprint,
            'requests': {'$add': [{'$cond': [same_day, '$requests', 0]}, 1]},
            'tokens': {'$add': [{'$cond': [same_day, '$tokens', 0]}, self.settings.reserved_tokens]},
            'cost': {'$add': [{'$cond': [same_day, '$cost', 0]}, self.settings.reserved_cost]},
        }}], return_document=ReturnDocument.AFTER)
        if not daily:
            raise QuotaExceeded()
        # Never refund failures: provider acceptance may precede network failure.

    async def close(self):
        await self.client.close()
