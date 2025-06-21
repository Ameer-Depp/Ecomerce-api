const express = require("express");
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
} = require("../controllers/cartController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// 🔐 ALL CART ROUTES REQUIRE AUTHENTICATION (Customer or Admin)
router.use(authenticateToken);

// 🛒 CART OPERATIONS
router.post("/add", addToCart); // Add item to cart
router.get("/", getCart); // Get user's cart
router.get("/summary", getCartSummary); // Get cart summary
router.put("/items/:itemId", updateCartItem); // Update cart item quantity
router.delete("/items/:itemId", removeFromCart); // Remove item from cart
router.delete("/clear", clearCart); // Clear entire cart

module.exports = router;

// 📝 ADD THIS LINE TO YOUR app.js:
// app.use("/api/cart", require("../routes/cart"));
