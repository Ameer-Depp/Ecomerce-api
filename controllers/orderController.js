const prisma = require("../config/database");
const asyncHandler = require("express-async-handler");
const joi = require("joi");

// 📦 VALIDATION SCHEMAS
const createOrderSchema = joi.object({
  shippingAddress: joi.string().min(10).max(500).optional(),
  notes: joi.string().max(500).optional(),
});

const updateOrderStatusSchema = joi.object({
  status: joi
    .string()
    .valid("PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED")
    .required(),
});

// 📦 CREATE ORDER FROM CART
const createOrder = asyncHandler(async (req, res) => {
  const { error, value } = createOrderSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { shippingAddress, notes } = value;
  const userId = req.user.id;

  // Get user's cart with items
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { inventory: true },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  // Validate all items are available and in stock
  const unavailableItems = [];
  const orderItems = [];
  let totalAmount = 0;

  for (const item of cart.items) {
    if (!item.product.isActive) {
      unavailableItems.push({
        productName: item.product.name,
        reason: "Product is no longer available",
      });
      continue;
    }

    if (item.product.inventory.quantity < item.quantity) {
      unavailableItems.push({
        productName: item.product.name,
        reason: `Only ${item.product.inventory.quantity} items available, but ${item.quantity} requested`,
      });
      continue;
    }

    // Prepare order item
    const itemTotal = parseFloat(item.product.price) * item.quantity;
    orderItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: item.product.price,
    });
    totalAmount += itemTotal;
  }

  if (unavailableItems.length > 0) {
    return res.status(400).json({
      message: "Some items in your cart are unavailable",
      unavailableItems,
    });
  }

  if (orderItems.length === 0) {
    return res.status(400).json({ message: "No valid items to order" });
  }

  // Create order in transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create the order
    const newOrder = await tx.order.create({
      data: {
        userId,
        totalAmount,
        status: "PENDING",
        shippingAddress,
        notes,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    // Update inventory for each item
    for (const item of cart.items) {
      if (
        item.product.isActive &&
        item.product.inventory.quantity >= item.quantity
      ) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }
    }

    // Clear the cart
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return newOrder;
  });

  res.status(201).json({
    message: "Order created successfully",
    order,
  });
});

// 📋 GET USER'S ORDERS
const getUserOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const where = {
    userId,
    ...(status && { status }),
  };

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  res.status(200).json({
    orders,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalCount,
      limit: limitNum,
    },
  });
});

// 🔍 GET SINGLE ORDER
const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId, // Ensure user can only see their own orders
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              price: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.status(200).json(order);
});

// 🚫 CANCEL ORDER
const cancelOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.status !== "PENDING") {
    return res.status(400).json({
      message: "Can only cancel pending orders",
    });
  }

  // Cancel order and restore inventory
  await prisma.$transaction(async (tx) => {
    // Update order status
    await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    // Restore inventory
    for (const item of order.items) {
      await tx.inventory.update({
        where: { productId: item.productId },
        data: {
          quantity: {
            increment: item.quantity,
          },
        },
      });
    }
  });

  res.status(200).json({ message: "Order cancelled successfully" });
});

// 👑 ADMIN: GET ALL ORDERS
const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, userId: filterUserId } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const where = {
    ...(status && { status }),
    ...(filterUserId && { userId: filterUserId }),
  };

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  res.status(200).json({
    orders,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalCount,
      limit: limitNum,
    },
  });
});

// 👑 ADMIN: UPDATE ORDER STATUS
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { error, value } = updateOrderStatusSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { status } = value;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  // If cancelling a confirmed/shipped order, restore inventory
  if (
    status === "CANCELLED" &&
    ["CONFIRMED", "SHIPPED"].includes(order.status)
  ) {
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { status },
      });

      // Restore inventory
      for (const item of order.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });
      }
    });
  } else {
    // Simple status update
    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  res.status(200).json({ message: "Order status updated successfully" });
});

// 📊 GET ORDER STATISTICS (Admin)
const getOrderStats = asyncHandler(async (req, res) => {
  const stats = await prisma.order.groupBy({
    by: ["status"],
    _count: {
      status: true,
    },
    _sum: {
      totalAmount: true,
    },
  });

  const totalOrders = await prisma.order.count();
  const totalRevenue = await prisma.order.aggregate({
    _sum: {
      totalAmount: true,
    },
    where: {
      status: {
        in: ["CONFIRMED", "SHIPPED", "DELIVERED"],
      },
    },
  });

  res.status(200).json({
    statusBreakdown: stats,
    totalOrders,
    totalRevenue: parseFloat(totalRevenue._sum.totalAmount || 0),
  });
});

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getOrderStats,
};
