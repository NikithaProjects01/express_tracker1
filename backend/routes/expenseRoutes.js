const express = require("express");
const upload = require("../middleware/upload");
const {
  uploadExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense
} = require("../controllers/expenseController");

const router = express.Router();

router.post("/upload", upload.single("image"), uploadExpense);
router.get("/", getExpenses);
router.get("/:id", getExpenseById);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;

