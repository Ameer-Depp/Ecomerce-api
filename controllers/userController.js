const bcrypt = require("bcryptjs");
const joi = require("joi");
const prisma = require("../config/database");
const asyncHandler = require("express-async-handler");

const updateUserSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().min(6).required(),
  firstName: joi.string().required(),
  lastName: joi.string().required(),
});

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany();
  return res.status(200).json(users);
});

const getOneUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findFirst({
    where: { id },
  });
  if (!user) {
    return res.status(404).json({ message: "this user does not exists" });
  }
  res.status(200).json(user);
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (!user) {
    return res.status(404).json({ message: "this user does not exists" });
  }
  await prisma.cart.delete({
    where: { userId: id },
  });
  await prisma.user.delete({
    where: { id },
  });

  return res.status(200).json({ message: "user has been deleted " });
});

const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error, value } = updateUserSchema.validate(req.body);
  if (error) {
    return res.status(200).json({ message: error.details[0].message });
  }
  const { email, firstName, lastName, password } = value;

  const checkUser = await prisma.user.findUnique({
    where: { id },
  });
  if (!checkUser) {
    return res.status(200).json({ message: "user does not exisist" });
  }
  const hashedPassword = await bcrypt.hash(password, 12);

  const updateduser = await prisma.user.update({
    where: { id },
    data: {
      email: email,
      firstName: firstName,
      lastName: lastName,
      password: hashedPassword,
    },
  });
  return res.status(201).json(updateduser);
});

module.exports = { getAllUsers, getOneUser, deleteUser, updateUser };
