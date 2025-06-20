const express = require("express");
const {
  getAllUsers,
  getOneUser,
  deleteUser,
  updateUser,
} = require("../controllers/userController");
const { requireAdmin, authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticateToken, requireAdmin, getAllUsers);
router.get("/:id", authenticateToken, requireAdmin, getOneUser);
router.delete("/:id", authenticateToken, requireAdmin, deleteUser);
router.put("/:id", authenticateToken, requireAdmin, updateUser);

module.exports = router;
