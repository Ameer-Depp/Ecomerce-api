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

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 */
router.get("/", getAllProducts);

/**
 * @swagger
 * /api/products/search:
 *   get:
 *     summary: Search products
 *     tags: [Products]
 */
router.get("/search", searchProducts);

/**
 * @swagger
 * /api/products/category/{categoryId}:
 *   get:
 *     summary: Get products by category
 *     tags: [Products]
 */
router.get("/category/:categoryId", getProductsByCategory);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 */
router.get("/:id", getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.post("/", authenticateToken, requireAdmin, createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id", authenticateToken, requireAdmin, updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", authenticateToken, requireAdmin, deleteProduct);

/**
 * @swagger
 * /api/products/{id}/inventory:
 *   patch:
 *     summary: Update product inventory
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  "/:id/inventory",
  authenticateToken,
  requireAdmin,
  updateInventory
);
// Update inventory

module.exports = router;
