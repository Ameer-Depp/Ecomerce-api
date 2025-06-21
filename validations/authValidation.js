const joi = require("joi");

const registerSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().min(6).required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
  role: joi.string().valid("CUSTOMER").default("CUSTOMER"),
});

const loginSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().required(),
});

module.exports = { registerSchema, loginSchema };
