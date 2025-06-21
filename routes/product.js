const express = require("express");
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateInventory,
  getProductsByCategory,
  searchProducts,
} = require("../controllers/productController");
const { requireAdmin, authenticateToken } = require("../middleware/auth");

const router = express.Router();

// 🔍 PUBLIC ROUTES (No authentication required)
router.get("/", getAllProducts); // Get all products with filtering
router.get("/search", searchProducts); // Search products
router.get("/category/:categoryId", getProductsByCategory); // Get products by category
router.get("/:id", getProductById); // Get single product

// 🔐 ADMIN ONLY ROUTES (Authentication + Admin role required)
router.post("/", authenticateToken, requireAdmin, createProduct); // Create product
router.put("/:id", authenticateToken, requireAdmin, updateProduct); // Update product
router.delete("/:id", authenticateToken, requireAdmin, deleteProduct); // Delete product
router.patch(
  "/:id/inventory",
  authenticateToken,
  requireAdmin,
  updateInventory
); // Update inventory

module.exports = router;
