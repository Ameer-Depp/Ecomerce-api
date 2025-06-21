const joi = require("joi");

const ALLOWED_CATEGORIES = [
  "ELECTRONICS",
  "CLOTHING",
  "BOOKS",
  "HOME_GARDEN",
  "SPORTS",
  "BEAUTY",
  "AUTOMOTIVE",
  "TOYS",
  "FOOD_BEVERAGES",
];

const createCategorySchema = joi.object({
  name: joi
    .string()
    .uppercase()
    .valid(...ALLOWED_CATEGORIES)
    .required(),
  description: joi.string().optional(),
  imageUrl: joi.string().uri().optional(),
});

const updateCategorySchema = joi.object({
  name: joi.string().uppercase().required(),
  description: joi.string().required(),
  imageUrl: joi.string().uri().optional(),
});

module.exports = { createCategorySchema, updateCategorySchema };
