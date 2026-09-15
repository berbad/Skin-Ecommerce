"""Validated, disabled-by-default configuration. No clients or I/O at import."""
import os
from dataclasses import dataclass, field
from urllib.parse import urlsplit

MAX_INPUT_TOKENS = 32768
MAX_OUTPUT_TOKENS = 500


@dataclass(frozen=True)
class Settings:
    enabled: bool = False
    environment: str = 'production'
    api_key: str = field(default='', repr=False)
    model: str = ''
    token_parameter: str = 'max_completion_tokens'
    catalog_uri: str = field(default='', repr=False)
    catalog_db: str = ''
    quota_uri: str = field(default='', repr=False)
    quota_db: str = ''
    origins: tuple[str, ...] = ()
    quota_secret: str = field(default='', repr=False)
    daily_requests: int = 0
    daily_tokens: int = 0
    daily_cost_microusd: int = 0
    input_microusd_per_token: int = 0
    output_microusd_per_token: int = 0

    def __post_init__(self):
        for origin in self.origins:
            parsed = urlsplit(origin)
            if parsed.scheme not in ('https', 'http') or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or parsed.username:
                raise ValueError('Chat origins must be exact HTTP origins')
            if self.environment == 'production' and parsed.scheme != 'https':
                raise ValueError('Production chat origins require HTTPS')
        if not self.enabled:
            return
        if not self.api_key or not self.model or len(self.model) > 100 or len(self.quota_secret) < 32:
            raise ValueError('Enabled chat requires provider model/key and quota secret')
        if self.token_parameter not in ('max_completion_tokens', 'max_tokens'):
            raise ValueError('Invalid provider token limit parameter')
        if not self.origins:
            raise ValueError('Enabled chat requires explicit origins')
        for uri, database in ((self.catalog_uri, self.catalog_db), (self.quota_uri, self.quota_db)):
            parsed = urlsplit(uri)
            if parsed.scheme not in ('mongodb', 'mongodb+srv') or not parsed.netloc or not database or any(c in database for c in '/\\.$ "'):
                raise ValueError('Enabled chat requires explicit Mongo configuration')
            if self.environment == 'production' and (not parsed.username or not parsed.password):
                raise ValueError('Production chat requires dedicated Mongo credentials')
        if self.catalog_db == self.quota_db:
            raise ValueError('Catalog and quotas must use separate databases')
        if self.environment == 'production' and urlsplit(self.catalog_uri).username == urlsplit(self.quota_uri).username:
            raise ValueError('Catalog and quotas must use separate credentials')
        for value, maximum in ((self.daily_requests, 10000), (self.daily_tokens, 1_000_000_000),
                               (self.daily_cost_microusd, 10_000_000_000),
                               (self.input_microusd_per_token, 10000), (self.output_microusd_per_token, 10000)):
            if type(value) is not int or value < 1 or value > maximum:
                raise ValueError('Chat budgets/prices must be explicitly configured positive bounded integers')
        if self.daily_tokens < self.reserved_tokens or self.daily_cost_microusd < self.reserved_cost:
            raise ValueError('Daily budget must accommodate at least one worst-case request')

    @property
    def reserved_tokens(self):
        return MAX_INPUT_TOKENS + MAX_OUTPUT_TOKENS

    @property
    def reserved_cost(self):
        return MAX_INPUT_TOKENS * self.input_microusd_per_token + MAX_OUTPUT_TOKENS * self.output_microusd_per_token

    @classmethod
    def from_env(cls):
        if os.getenv('CHAT_ENABLED') != 'true':
            return cls(environment=os.getenv('APP_ENV', 'production'),
                       origins=tuple(filter(None, os.getenv('CHAT_ALLOWED_ORIGINS', '').split(','))))
        return cls(enabled=True, environment=os.getenv('APP_ENV', 'production'),
                   api_key=os.getenv('OPENAI_API_KEY', ''), model=os.getenv('CHAT_MODEL', ''),
                   token_parameter=os.getenv('CHAT_TOKEN_PARAMETER', 'max_completion_tokens'),
                   catalog_uri=os.getenv('CHAT_CATALOG_MONGODB_URI', ''), catalog_db=os.getenv('CHAT_CATALOG_DB', ''),
                   quota_uri=os.getenv('CHAT_QUOTA_MONGODB_URI', ''), quota_db=os.getenv('CHAT_QUOTA_DB', ''),
                   origins=tuple(filter(None, os.getenv('CHAT_ALLOWED_ORIGINS', '').split(','))),
                   quota_secret=os.getenv('CHAT_QUOTA_SECRET', ''),
                   daily_requests=int(os.getenv('CHAT_DAILY_REQUESTS', '0')),
                   daily_tokens=int(os.getenv('CHAT_DAILY_TOKENS', '0')),
                   daily_cost_microusd=int(os.getenv('CHAT_DAILY_COST_MICROUSD', '0')),
                   input_microusd_per_token=int(os.getenv('CHAT_INPUT_MICROUSD_PER_TOKEN', '0')),
                   output_microusd_per_token=int(os.getenv('CHAT_OUTPUT_MICROUSD_PER_TOKEN', '0')))
