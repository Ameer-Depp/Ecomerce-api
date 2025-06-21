const prisma = require("../config/database");
const asyncHandler = require("express-async-handler");
const joi = require("joi");

// 🛒 VALIDATION SCHEMAS
const addToCartSchema = joi.object({
  productId: joi.string().required(),
  quantity: joi.number().integer().min(1).max(99).default(1),
});

const updateCartItemSchema = joi.object({
  quantity: joi.number().integer().min(1).max(99).required(),
});

// 🛒 ADD TO CART
const addToCart = asyncHandler(async (req, res) => {
  const { error, value } = addToCartSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { productId, quantity } = value;
  const userId = req.user.id;

  // Check if product exists and is active
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      inventory: true,
    },
  });

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (!product.isActive) {
    return res.status(400).json({ message: "Product is not available" });
  }

  // Check inventory
  if (product.inventory.quantity < quantity) {
    return res.status(400).json({
      message: `Only ${product.inventory.quantity} items available in stock`,
    });
  }

  // Get or create user's cart
  let cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
    });
  }

  // Check if item already exists in cart
  const existingCartItem = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
  });

  let cartItem;
  if (existingCartItem) {
    // Update existing item
    const newQuantity = existingCartItem.quantity + quantity;

    // Check total quantity against inventory
    if (product.inventory.quantity < newQuantity) {
      return res.status(400).json({
        message: `Cannot add ${quantity} more items. Only ${
          product.inventory.quantity - existingCartItem.quantity
        } more available`,
      });
    }

    cartItem = await prisma.cartItem.update({
      where: { id: existingCartItem.id },
      data: { quantity: newQuantity },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
          },
        },
      },
    });
  } else {
    // Create new cart item
    cartItem = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
          },
        },
      },
    });
  }

  res.status(200).json({
    message: "Item added to cart successfully",
    cartItem,
  });
});

// 🛒 GET USER'S CART
const getCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true,
              isActive: true,
              inventory: {
                select: { quantity: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!cart) {
    return res.status(200).json({
      items: [],
      totalItems: 0,
      totalAmount: 0,
    });
  }

  // Calculate totals
  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.items.reduce(
    (sum, item) => sum + parseFloat(item.product.price) * item.quantity,
    0
  );

  // Check for inactive products or out of stock
  const unavailableItems = cart.items.filter(
    (item) => !item.product.isActive || item.product.inventory.quantity === 0
  );

  res.status(200).json({
    cartId: cart.id,
    items: cart.items,
    totalItems,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    unavailableItems:
      unavailableItems.length > 0 ? unavailableItems : undefined,
  });
});

// ✏️ UPDATE CART ITEM QUANTITY
const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { error, value } = updateCartItemSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { quantity } = value;
  const userId = req.user.id;

  // Find cart item and verify ownership
  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      cart: { userId },
    },
    include: {
      product: {
        include: { inventory: true },
      },
    },
  });

  if (!cartItem) {
    return res.status(404).json({ message: "Cart item not found" });
  }

  // Check inventory
  if (cartItem.product.inventory.quantity < quantity) {
    return res.status(400).json({
      message: `Only ${cartItem.product.inventory.quantity} items available in stock`,
    });
  }

  const updatedCartItem = await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
        },
      },
    },
  });

  res.status(200).json({
    message: "Cart item updated successfully",
    cartItem: updatedCartItem,
  });
});

// 🗑️ REMOVE ITEM FROM CART
const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const userId = req.user.id;

  // Find cart item and verify ownership
  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      cart: { userId },
    },
  });

  if (!cartItem) {
    return res.status(404).json({ message: "Cart item not found" });
  }

  await prisma.cartItem.delete({
    where: { id: itemId },
  });

  res.status(200).json({ message: "Item removed from cart successfully" });
});

// 🧹 CLEAR CART
const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    return res.status(404).json({ message: "Cart not found" });
  }

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  res.status(200).json({ message: "Cart cleared successfully" });
});

// 📊 GET CART SUMMARY
const getCartSummary = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: { price: true, isActive: true },
          },
        },
      },
    },
  });

  if (!cart) {
    return res.status(200).json({
      totalItems: 0,
      totalAmount: 0,
      availableItems: 0,
    });
  }

  const availableItems = cart.items.filter((item) => item.product.isActive);
  const totalItems = availableItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const totalAmount = availableItems.reduce(
    (sum, item) => sum + parseFloat(item.product.price) * item.quantity,
    0
  );

  res.status(200).json({
    totalItems,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    availableItems: availableItems.length,
    unavailableItems: cart.items.length - availableItems.length,
  });
});

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
};
