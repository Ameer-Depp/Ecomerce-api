const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const setupSwagger = require("../config/swagger");
const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
setupSwagger(app);

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "E-commerce API is running!",
    timestamp: new Date().toISOString(),
  });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", require("../routes/auth"));
app.use("/api/user", require("../routes/user"));
app.use("/api/category", require("../routes/category"));
app.use("/api/products", require("../routes/product"));
app.use("/api/cart", require("../routes/cart"));
app.use("/api/orders", require("../routes/order"));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

module.exports = app;
