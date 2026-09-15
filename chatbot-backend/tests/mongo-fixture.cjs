// stdout is the connection-URI protocol; cold-cache download logs belong on stderr.
console.log = (...args) => console.error(...args);
const {
  MongoMemoryServer,
} = require("../../backend/node_modules/mongodb-memory-server");
(async () => {
  const server = await MongoMemoryServer.create();
  process.stdout.write(server.getUri() + "\n");
  const stop = async () => {
    await server.stop();
    process.exit(0);
  };
  process.stdin.once("data", stop);
  process.stdin.once("end", stop);
})().catch(() => {
  console.error("Local Mongo test fixture could not start");
  process.exit(1);
});
