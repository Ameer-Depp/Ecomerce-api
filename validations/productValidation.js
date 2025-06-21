const joi = require("joi");

// Create Product Validation Schema
const createProductSchema = joi.object({
  name: joi.string().trim().min(2).max(100).required(),
  description: joi.string().trim().max(1000).optional(),
  price: joi.number().positive().precision(2).required().messages({
    "number.positive": "Price must be a positive number",
    "number.base": "Price must be a valid number",
  }),
  imageUrl: joi.string().uri().optional(),
  categoryId: joi.string().required().messages({
    "string.empty": "Category is required",
  }),
  isActive: joi.boolean().default(true),
  // Initial inventory quantity when creating product
  initialQuantity: joi.number().integer().min(0).default(0).messages({
    "number.min": "Initial quantity cannot be negative",
    "number.integer": "Initial quantity must be a whole number",
  }),
});

// Update Product Validation Schema
const updateProductSchema = joi.object({
  name: joi.string().trim().min(2).max(100).optional(),
  description: joi.string().trim().max(1000).optional(),
  price: joi.number().positive().precision(2).optional().messages({
    "number.positive": "Price must be a positive number",
    "number.base": "Price must be a valid number",
  }),
  imageUrl: joi.string().uri().optional(),
  categoryId: joi.string().optional(),
  isActive: joi.boolean().optional(),
});

// Product Query/Filter Validation Schema
const productQuerySchema = joi
  .object({
    page: joi.number().integer().min(1).default(1),
    limit: joi.number().integer().min(1).max(100).default(10),
    categoryId: joi.string().optional(),
    search: joi.string().trim().max(100).optional(),
    minPrice: joi.number().positive().optional(),
    maxPrice: joi.number().positive().optional(),
    isActive: joi.boolean().default(true),
    sortBy: joi
      .string()
      .valid("name", "price", "createdAt")
      .default("createdAt"),
    sortOrder: joi.string().valid("asc", "desc").default("desc"),
  })
  .custom((value, helpers) => {
    // Ensure minPrice is less than maxPrice if both are provided
    if (value.minPrice && value.maxPrice && value.minPrice >= value.maxPrice) {
      return helpers.error("custom.minMaxPrice");
    }
    return value;
  }, "Price Range Validation")
  .messages({
    "custom.minMaxPrice": "Minimum price must be less than maximum price",
  });

// Update Inventory Validation Schema
const updateInventorySchema = joi.object({
  quantity: joi.number().integer().min(0).required().messages({
    "number.min": "Quantity cannot be negative",
    "number.integer": "Quantity must be a whole number",
  }),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  updateInventorySchema,
};
