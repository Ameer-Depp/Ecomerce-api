const express = require("express");
const {
  createCategory,
  getAllCategories,
  deleteCategories,
  updateCategory,
} = require("../controllers/categoryController");
const { requireAdmin, authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticateToken, requireAdmin, getAllCategories);
router.post("/", authenticateToken, requireAdmin, createCategory);
router.delete("/:id", authenticateToken, requireAdmin, deleteCategories);
router.put("/:id", authenticateToken, requireAdmin, updateCategory);

module.exports = router;
