const prisma = require("../config/database");
const asyncHandler = require("express-async-handler");
const CacheService = require("../services/CacheService");
const {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  updateInventorySchema,
} = require("../validations/productValidation");

// 🔥 CREATE PRODUCT
const createProduct = asyncHandler(async (req, res) => {
  const { error, value } = createProductSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const {
    name,
    description,
    price,
    imageUrl,
    categoryId,
    isActive,
    initialQuantity,
  } = value;

  // Check if category exists
  let category = await CacheService.getCategory(categoryId);
  if (!category) {
    category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Cache the category
    await CacheService.setCategory(categoryId, category);
  }

  // Create product with inventory in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the product
    const product = await tx.product.create({
      data: {
        name,
        description,
        price,
        imageUrl,
        categoryId,
        isActive,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    // Create initial inventory
    const inventory = await tx.inventory.create({
      data: {
        productId: product.id,
        quantity: initialQuantity,
      },
    });

    return { ...product, inventory };
  });

  // Cache the new product
  await CacheService.setProduct(result.id, result);

  // Invalidate related caches
  await CacheService.invalidateAllProductCaches();

  res.status(201).json({
    message: "Product created successfully",
    product: result,
  });
});

// 📋 GET ALL PRODUCTS (with filtering, pagination, search)
const getAllProducts = asyncHandler(async (req, res) => {
  const { error, value } = productQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const {
    page,
    limit,
    categoryId,
    search,
    minPrice,
    maxPrice,
    isActive,
    sortBy,
    sortOrder,
  } = value;

  // Try to get from cache first
  const cachedResult = await CacheService.getProductsList(value);
  if (cachedResult) {
    return res.status(200).json(cachedResult);
  }

  // Build where clause
  const where = {
    isActive,
    ...(categoryId && { categoryId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(minPrice || maxPrice
      ? {
          price: {
            ...(minPrice && { gte: minPrice }),
            ...(maxPrice && { lte: maxPrice }),
          },
        }
      : {}),
  };

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Execute queries
  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        isActive: true,
        imageUrl: true,
        category: {
          select: { name: true },
        },
        inventory: {
          select: { quantity: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  const result = {
    products,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };

  // Cache the result
  await CacheService.setProductsList(value, result);

  res.status(200).json(result);
});

// 🔍 GET SINGLE PRODUCT
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try cache first
  let product = await CacheService.getProduct(id);

  if (!product) {
    // Get from database
    product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true },
        },
        inventory: {
          select: { quantity: true },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Cache the product
    await CacheService.setProduct(id, product);
  }

  res.status(200).json(product);
});

// ✏️ UPDATE PRODUCT
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error, value } = updateProductSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { name, description, price, imageUrl, categoryId, isActive } = value;

  // Check if product exists
  const existingProduct = await prisma.product.findUnique({
    where: { id },
  });

  if (!existingProduct) {
    return res.status(404).json({ message: "Product not found" });
  }

  // If categoryId is being updated, verify it exists
  if (categoryId) {
    let category = await CacheService.getCategory(categoryId);
    if (!category) {
      category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      await CacheService.setCategory(categoryId, category);
    }
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(price && { price }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(categoryId && { categoryId }),
      ...(isActive !== undefined && { isActive }),
    },
    include: {
      category: {
        select: { id: true, name: true },
      },
      inventory: {
        select: { quantity: true },
      },
    },
  });

  // Update cache
  await CacheService.setProduct(id, updatedProduct);

  // Invalidate related caches
  await CacheService.invalidateAllProductCaches();

  res.status(200).json({
    message: "Product updated successfully",
    product: updatedProduct,
  });
});

// 🗑️ DELETE PRODUCT
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // Delete product (cascade will handle inventory)
  await prisma.product.delete({
    where: { id },
  });

  // Invalidate caches
  await CacheService.invalidateProduct(id);
  await CacheService.invalidateAllProductCaches();

  res.status(200).json({ message: "Product deleted successfully" });
});

// 📦 UPDATE INVENTORY
const updateInventory = asyncHandler(async (req, res) => {
  const { id } = req.params; // product ID
  const { error, value } = updateInventorySchema.validate(req.body);

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { quantity } = value;

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id },
    include: { inventory: true },
  });

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // Update inventory
  const updatedInventory = await prisma.inventory.update({
    where: { productId: id },
    data: { quantity },
  });

  // Update caches
  await CacheService.setInventory(id, updatedInventory);
  await CacheService.invalidateProduct(id); // Product cache includes inventory
  await CacheService.invalidateAllProductCaches();

  res.status(200).json({
    message: "Inventory updated successfully",
    inventory: updatedInventory,
  });
});

// 📊 GET PRODUCTS BY CATEGORY
const getProductsByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Validate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    return res.status(400).json({ message: "Invalid pagination parameters" });
  }

  // Try cache first
  const cachedResult = await CacheService.getCategoryProducts(
    categoryId,
    pageNum,
    limitNum
  );
  if (cachedResult) {
    return res.status(200).json(cachedResult);
  }

  // Check if category exists
  let category = await CacheService.getCategory(categoryId);
  if (!category) {
    category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await CacheService.setCategory(categoryId, category);
  }

  const skip = (pageNum - 1) * limitNum;

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: {
        categoryId,
        isActive: true,
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        inventory: {
          select: { quantity: true },
        },
      },
    }),
    prisma.product.count({
      where: {
        categoryId,
        isActive: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  const result = {
    category: category.name,
    products,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalCount,
      limit: limitNum,
    },
  };

  // Cache the result
  await CacheService.setCategoryProducts(categoryId, pageNum, limitNum, result);

  res.status(200).json(result);
});

// 🔍 SEARCH PRODUCTS
const searchProducts = asyncHandler(async (req, res) => {
  const { q: query, page = 1, limit = 10 } = req.query;

  if (!query || query.trim().length < 2) {
    return res
      .status(400)
      .json({ message: "Search query must be at least 2 characters" });
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  // Try cache first
  const cachedResult = await CacheService.getSearchResults(
    query.trim(),
    pageNum,
    limitNum
  );
  if (cachedResult) {
    return res.status(200).json(cachedResult);
  }

  const skip = (pageNum - 1) * limitNum;

  const searchCondition = {
    isActive: true,
    OR: [
      { name: { contains: query.trim(), mode: "insensitive" } },
      { description: { contains: query.trim(), mode: "insensitive" } },
      {
        category: {
          name: { contains: query.trim(), mode: "insensitive" },
        },
      },
    ],
  };

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: searchCondition,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        category: {
          select: { id: true, name: true },
        },
        inventory: {
          select: { quantity: true },
        },
      },
    }),
    prisma.product.count({ where: searchCondition }),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  const result = {
    query,
    products,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalCount,
      limit: limitNum,
    },
  };

  // Cache the result
  await CacheService.setSearchResults(query.trim(), pageNum, limitNum, result);

  res.status(200).json(result);
});

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateInventory,
  getProductsByCategory,
  searchProducts,
};
