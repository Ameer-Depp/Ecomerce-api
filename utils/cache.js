const { client } = require("../config/redis");

class CacheService {
  static async get(key) {
    try {
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  static async set(key, data, ttl = 3600) {
    // Default 1 hour TTL
    try {
      await client.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  static async del(key) {
    try {
      await client.del(key);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  static async delPattern(pattern) {
    try {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.error("Cache delete pattern error:", error);
    }
  }
}

module.exports = CacheService;
