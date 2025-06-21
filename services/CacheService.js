const { client } = require("../config/redis");

class CacheService {
  // Generic cache methods
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

  // E-commerce specific cache methods
  static generateCacheKey(prefix, ...params) {
    return `${prefix}:${params.join(":")}`;
  }

  // Product caching methods
  static async getProduct(productId) {
    const key = this.generateCacheKey("product", productId);
    return await this.get(key);
  }

  static async setProduct(productId, productData, ttl = 1800) {
    // 30 minutes
    const key = this.generateCacheKey("product", productId);
    await this.set(key, productData, ttl);
  }

  static async invalidateProduct(productId) {
    const key = this.generateCacheKey("product", productId);
    await this.del(key);
    // Also invalidate related caches
    await this.delPattern(`products:*`);
    await this.delPattern(`category:*:products`);
  }

  // Products list caching
  static async getProductsList(params) {
    const key = this.generateCacheKey(
      "products",
      params.page || 1,
      params.limit || 10,
      params.categoryId || "all",
      params.search || "none",
      params.minPrice || "min",
      params.maxPrice || "max",
      params.isActive !== undefined ? params.isActive : "true",
      params.sortBy || "createdAt",
      params.sortOrder || "desc"
    );
    return await this.get(key);
  }

  static async setProductsList(params, data, ttl = 600) {
    // 10 minutes
    const key = this.generateCacheKey(
      "products",
      params.page || 1,
      params.limit || 10,
      params.categoryId || "all",
      params.search || "none",
      params.minPrice || "min",
      params.maxPrice || "max",
      params.isActive !== undefined ? params.isActive : "true",
      params.sortBy || "createdAt",
      params.sortOrder || "desc"
    );
    await this.set(key, data, ttl);
  }

  // Category caching methods
  static async getCategories() {
    return await this.get("categories:all");
  }

  static async setCategories(data, ttl = 3600) {
    // 1 hour
    await this.set("categories:all", data, ttl);
  }

  static async invalidateCategories() {
    await this.del("categories:all");
    await this.delPattern("category:*");
  }

  static async getCategory(categoryId) {
    const key = this.generateCacheKey("category", categoryId);
    return await this.get(key);
  }

  static async setCategory(categoryId, data, ttl = 3600) {
    const key = this.generateCacheKey("category", categoryId);
    await this.set(key, data, ttl);
  }

  // Category products caching
  static async getCategoryProducts(categoryId, page = 1, limit = 10) {
    const key = this.generateCacheKey(
      "category",
      categoryId,
      "products",
      page,
      limit
    );
    return await this.get(key);
  }

  static async setCategoryProducts(categoryId, page, limit, data, ttl = 600) {
    const key = this.generateCacheKey(
      "category",
      categoryId,
      "products",
      page,
      limit
    );
    await this.set(key, data, ttl);
  }

  // User cart caching
  static async getUserCart(userId) {
    const key = this.generateCacheKey("cart", userId);
    return await this.get(key);
  }

  static async setUserCart(userId, cartData, ttl = 300) {
    // 5 minutes
    const key = this.generateCacheKey("cart", userId);
    await this.set(key, cartData, ttl);
  }

  static async invalidateUserCart(userId) {
    const key = this.generateCacheKey("cart", userId);
    await this.del(key);
  }

  // User orders caching
  static async getUserOrders(userId, page = 1, limit = 10, status = "all") {
    const key = this.generateCacheKey("orders", userId, page, limit, status);
    return await this.get(key);
  }

  static async setUserOrders(userId, page, limit, status, data, ttl = 300) {
    const key = this.generateCacheKey("orders", userId, page, limit, status);
    await this.set(key, data, ttl);
  }

  static async invalidateUserOrders(userId) {
    await this.delPattern(`orders:${userId}:*`);
  }

  // Order caching
  static async getOrder(orderId) {
    const key = this.generateCacheKey("order", orderId);
    return await this.get(key);
  }

  static async setOrder(orderId, orderData, ttl = 600) {
    const key = this.generateCacheKey("order", orderId);
    await this.set(key, orderData, ttl);
  }

  static async invalidateOrder(orderId) {
    const key = this.generateCacheKey("order", orderId);
    await this.del(key);
  }

  // Search results caching
  static async getSearchResults(query, page = 1, limit = 10) {
    const key = this.generateCacheKey(
      "search",
      query.toLowerCase(),
      page,
      limit
    );
    return await this.get(key);
  }

  static async setSearchResults(query, page, limit, data, ttl = 600) {
    const key = this.generateCacheKey(
      "search",
      query.toLowerCase(),
      page,
      limit
    );
    await this.set(key, data, ttl);
  }

  // User data caching
  static async getUser(userId) {
    const key = this.generateCacheKey("user", userId);
    return await this.get(key);
  }

  static async setUser(userId, userData, ttl = 1800) {
    const key = this.generateCacheKey("user", userId);
    await this.set(key, userData, ttl);
  }

  static async invalidateUser(userId) {
    const key = this.generateCacheKey("user", userId);
    await this.del(key);
  }

  // Admin: All users caching
  static async getAllUsers() {
    return await this.get("users:all");
  }

  static async setAllUsers(data, ttl = 600) {
    await this.set("users:all", data, ttl);
  }

  static async invalidateAllUsers() {
    await this.del("users:all");
  }

  // Order statistics caching (for admin)
  static async getOrderStats() {
    return await this.get("stats:orders");
  }

  static async setOrderStats(data, ttl = 300) {
    // 5 minutes
    await this.set("stats:orders", data, ttl);
  }

  static async invalidateOrderStats() {
    await this.del("stats:orders");
  }

  // Inventory caching
  static async getInventory(productId) {
    const key = this.generateCacheKey("inventory", productId);
    return await this.get(key);
  }

  static async setInventory(productId, inventoryData, ttl = 300) {
    const key = this.generateCacheKey("inventory", productId);
    await this.set(key, inventoryData, ttl);
  }

  static async invalidateInventory(productId) {
    const key = this.generateCacheKey("inventory", productId);
    await this.del(key);
  }

  // Bulk invalidation methods
  static async invalidateAllProductCaches() {
    await Promise.all([
      this.delPattern("product:*"),
      this.delPattern("products:*"),
      this.delPattern("category:*:products"),
      this.delPattern("search:*"),
      this.delPattern("inventory:*"),
    ]);
  }

  static async invalidateAllOrderCaches() {
    await Promise.all([
      this.delPattern("orders:*"),
      this.delPattern("order:*"),
      this.del("stats:orders"),
    ]);
  }

  static async invalidateAllUserCaches() {
    await Promise.all([
      this.delPattern("user:*"),
      this.del("users:all"),
      this.delPattern("cart:*"),
      this.delPattern("orders:*"),
    ]);
  }

  // Cache warming methods
  static async warmProductCache(productId, prisma) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: { select: { id: true, name: true } },
          inventory: { select: { quantity: true } },
        },
      });

      if (product) {
        await this.setProduct(productId, product);
      }
    } catch (error) {
      console.error("Cache warming error for product:", error);
    }
  }

  static async warmCategoriesCache(prisma) {
    try {
      const categories = await prisma.category.findMany();
      await this.setCategories(categories);
    } catch (error) {
      console.error("Cache warming error for categories:", error);
    }
  }
}

module.exports = CacheService;
