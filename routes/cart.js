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
/**
 * @swagger
 * /api/cart/add:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Item added
 */
router.post("/add", addToCart);

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Get current user's cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved
 */
router.get("/", getCart);

/**
 * @swagger
 * /api/cart/summary:
 *   get:
 *     summary: Get cart summary
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart summary
 */
router.get("/summary", getCartSummary);

/**
 * @swagger
 * /api/cart/items/{itemId}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item updated
 */
router.put("/items/:itemId", updateCartItem);

/**
 * @swagger
 * /api/cart/items/{itemId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed
 */
router.delete("/items/:itemId", removeFromCart);

/**
 * @swagger
 * /api/cart/clear:
 *   delete:
 *     summary: Clear cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared
 */
router.delete("/clear", clearCart);

module.exports = router;

// 📝 ADD THIS LINE TO YOUR app.js:
// app.use("/api/cart", require("../routes/cart"));
