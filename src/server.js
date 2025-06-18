require("dotenv").config();
const app = require("./app");
const { connectRedis } = require("../config/redis"); // <- Fixed path

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test Redis connection
    await connectRedis();
    console.log("✅ Redis connected successfully");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
