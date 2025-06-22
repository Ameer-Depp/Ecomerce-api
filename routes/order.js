const express = require("express");
const {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getOrderStats,
} = require("../controllers/orderController");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// 🔐 ALL ORDER ROUTES REQUIRE AUTHENTICATION
router.use(authenticateToken);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Order created
 */
router.post("/", createOrder);

/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Get current user's orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 */
router.get("/my-orders", getUserOrders);

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:orderId", getOrderById);

/**
 * @swagger
 * /api/orders/{orderId}/cancel:
 *   delete:
 *     summary: Cancel an order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:orderId/cancel", cancelOrder);

/**
 * @swagger
 * /api/orders/admin/all:
 *   get:
 *     summary: Get all orders (admin)
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get("/admin/all", requireAdmin, getAllOrders);

/**
 * @swagger
 * /api/orders/admin/{orderId}/status:
 *   patch:
 *     summary: Update order status
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 */
router.patch("/admin/:orderId/status", requireAdmin, updateOrderStatus);

/**
 * @swagger
 * /api/orders/admin/stats:
 *   get:
 *     summary: Get order statistics
 *     tags: [Admin Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get("/admin/stats", requireAdmin, getOrderStats);

module.exports = router;

// 📝 ADD THIS LINE TO YOUR app.js:
// app.use("/api/orders", require("../routes/order"));
