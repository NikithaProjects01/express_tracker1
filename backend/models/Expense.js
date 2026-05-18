const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 }
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    imageName: { type: String, required: true },
    imageMimeType: { type: String, required: true },
    imagePath: { type: String, required: true },

    extractedText: { type: String, default: "" },
    imageContextSummary: { type: String, default: "" },

    merchantName: { type: String, default: "" },
    expenseDate: { type: String, default: "" },
    items: { type: [itemSchema], default: [] },

    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: "" },

    paymentMethod: { type: String, default: "" },
    category: { type: String, default: "" },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Expense || mongoose.model("Expense", expenseSchema);
