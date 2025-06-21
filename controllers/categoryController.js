const prisma = require("../config/database");
const asyncHandler = require("express-async-handler");
const {
  updateCategorySchema,
  createCategorySchema,
} = require("../validations/categoryValidation");

const createCategory = asyncHandler(async (req, res) => {
  const { error, value } = createCategorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { name, description, imageUrl } = value; // Fixed destructuring

  const checkCategory = await prisma.category.findUnique({
    where: { name },
  });
  if (checkCategory) {
    return res
      .status(409) // Changed status code
      .json({ message: "this category is already in the database" });
  }

  const newCategory = await prisma.category.create({
    // Better variable name
    data: {
      name,
      description,
      imageUrl,
    },
  });

  res.status(201).json({
    message: "Category added successfully",
    category: newCategory, // Consistent naming
  });
});

const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany();
  return res.status(200).json(categories);
});

const deleteCategories = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await prisma.category.findUnique({
    where: { id },
  });
  if (!category) {
    return res.status(404).json({ message: "this category does not exists" });
  }
  await prisma.category.delete({
    where: { id },
  });

  return res.status(200).json({ message: "category has been deleted " });
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

  // 🔍 Check if the new name is already taken by another category
  if (name) {
    const nameTaken = await prisma.category.findFirst({
      where: {
        name,
        NOT: {
          id: existingCategory.id, // Exclude the current category
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

  return res.status(200).json({
    message: "Category updated successfully",
    category: updatedCategory,
  });
});

module.exports = {
  createCategory,
  getAllCategories,
  deleteCategories,
  updateCategory,
};
