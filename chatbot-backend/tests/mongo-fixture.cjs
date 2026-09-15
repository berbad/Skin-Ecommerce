const {
  MongoMemoryServer,
} = require("../../backend/node_modules/mongodb-memory-server");
(async () => {
  const server = await MongoMemoryServer.create();
  process.stdout.write(server.getUri() + "\n");
  process.stdin.once("data", async () => {
    await server.stop();
    process.exit(0);
  });
})().catch(() => {
  console.error("Local Mongo test fixture could not start");
  process.exit(1);
});
