const joi = require("joi");

const updateUserSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().min(6).required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
});

module.exports = { updateUserSchema };
