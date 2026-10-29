const path = require('path');

// Uses TEST_MONGO_URI if you provide a replica-set URI; otherwise starts an in-memory replica set.
module.exports = async () => {
  if (process.env.TEST_MONGO_URI) return;
  if (!process.env.MONGOMS_DOWNLOAD_DIR) {
    process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '../../node_modules/.cache/mongodb-memory-server');
  }
  const { MongoMemoryReplSet } = require('mongodb-memory-server');
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  globalThis.__RS__ = rs;
  process.env.TEST_MONGO_URI = rs.getUri();
};
