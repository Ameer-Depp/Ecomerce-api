const redis = require("redis");

const client = redis.createClient({
  url: process.env.REDIS_URL,
});

client.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

client.on("connect", () => {
  console.log("🔥 Redis client connected");
});

const connectRedis = async () => {
  if (!client.isOpen) {
    await client.connect();
  }
  return client;
};

module.exports = { client, connectRedis };
