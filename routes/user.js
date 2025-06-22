const express = require("express");
const {
  getAllUsers,
  getOneUser,
  deleteUser,
  updateUser,
} = require("../controllers/userController");
const { requireAdmin, authenticateToken } = require("../middleware/auth");

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", authenticateToken, requireAdmin, getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id", authenticateToken, requireAdmin, getOneUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", authenticateToken, requireAdmin, deleteUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id", authenticateToken, requireAdmin, updateUser);

module.exports = router;
