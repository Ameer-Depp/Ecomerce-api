const prisma = require("../config/database");
const asyncHandler = require("express-async-handler");
const CacheService = require("../services/CacheService");
const {
  updateCategorySchema,
  createCategorySchema,
} = require("../validations/categoryValidation");

const createCategory = asyncHandler(async (req, res) => {
  const { error, value } = createCategorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { name, description, imageUrl } = value;

  const checkCategory = await prisma.category.findUnique({
    where: { name },
  });
  if (checkCategory) {
    return res
      .status(409)
      .json({ message: "this category is already in the database" });
  }

  const newCategory = await prisma.category.create({
    data: {
      name,
      description,
      imageUrl,
    },
  });

  // Cache the new category
  await CacheService.setCategory(newCategory.id, newCategory);

  // Invalidate categories list cache
  await CacheService.invalidateCategories();

  res.status(201).json({
    message: "Category added successfully",
    category: newCategory,
  });
});

const getAllCategories = asyncHandler(async (req, res) => {
  // Try cache first
  let categories = await CacheService.getCategories();

  if (!categories) {
    // Get from database
    categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        createdAt: true,
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    // Cache the result
    await CacheService.setCategories(categories, 3600); // 1 hour
  }

  return res.status(200).json(categories);
});

const deleteCategories = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!category) {
    return res.status(404).json({ message: "this category does not exists" });
  }

  // Check if category has products
  if (category._count.products > 0) {
    return res.status(400).json({
      message: "Cannot delete category with existing products",
    });
  }

  await prisma.category.delete({
    where: { id },
  });

  // Invalidate caches
  await CacheService.invalidateCategories();
  await CacheService.delPattern(`category:${id}:*`);

  return res.status(200).json({ message: "category has been deleted" });
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { error, value } = updateCategorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { name, description, imageUrl } = value;

  const existingCategory = await prisma.category.findUnique({
    where: { id },
  });

  if (!existingCategory) {
    return res.status(404).json({ message: "This category does not exist" });
  }

  // Check if the new name is already taken by another category
  if (name) {
    const nameTaken = await prisma.category.findFirst({
      where: {
        name,
        NOT: {
          id: existingCategory.id,
        },
      },
    });

    if (nameTaken) {
      return res
        .status(409)
        .json({ message: "This category name is already in use" });
    }
  }

  const updatedCategory = await prisma.category.update({
    where: { id },
    data: {
      name,
      description,
      imageUrl,
    },
  });

  // Update caches
  await CacheService.setCategory(id, updatedCategory);
  await CacheService.invalidateCategories();

  // Invalidate related product caches
  await CacheService.delPattern(`category:${id}:products:*`);

  return res.status(200).json({
    message: "Category updated successfully",
    category: updatedCategory,
  });
});

// Get single category with products count
const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Try cache first
  let category = await CacheService.getCategory(id);

  if (!category) {
    category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Cache the category
    await CacheService.setCategory(id, category);
  }

  return res.status(200).json(category);
});

module.exports = {
  createCategory,
  getAllCategories,
  deleteCategories,
  updateCategory,
  getCategoryById,
};
