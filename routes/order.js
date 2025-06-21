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

// 📦 CUSTOMER ORDER ROUTES
router.post("/", createOrder); // Create order from cart
router.get("/my-orders", getUserOrders); // Get user's orders
router.get("/:orderId", getOrderById); // Get single order details
router.delete("/:orderId/cancel", cancelOrder); // Cancel order

// 👑 ADMIN ORDER ROUTES
router.get("/admin/all", requireAdmin, getAllOrders); // Get all orders (admin)
router.patch("/admin/:orderId/status", requireAdmin, updateOrderStatus); // Update order status (admin)
router.get("/admin/stats", requireAdmin, getOrderStats); // Get order statistics (admin)

module.exports = router;

// 📝 ADD THIS LINE TO YOUR app.js:
// app.use("/api/orders", require("../routes/order"));
