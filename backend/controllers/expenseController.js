const path = require("path");
const axios = require("axios");
const Expense = require("../models/Expense");

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    name: item.name || "",
    quantity: toNumber(item.quantity || 1),
    price: toNumber(item.price)
  }));
}

function normalizeExpenseData(data) {
  return {
    extractedText: data.extractedText || "",
    imageContextSummary: data.imageContextSummary || "",
    merchantName: data.merchantName || "",
    expenseDate: data.expenseDate || "",
    items: normalizeItems(data.items),
    subtotal: toNumber(data.subtotal),
    tax: toNumber(data.tax),
    totalAmount: toNumber(data.totalAmount),
    currency: data.currency || "",
    paymentMethod: data.paymentMethod || "",
    category: data.category || "",
    notes: data.notes || ""
  };
}

function normalizeExpenseUpdates(data) {
  const allowedFields = [
    "extractedText",
    "imageContextSummary",
    "merchantName",
    "expenseDate",
    "items",
    "subtotal",
    "tax",
    "totalAmount",
    "currency",
    "paymentMethod",
    "category",
    "notes"
  ];
  const updates = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      updates[field] = data[field];
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, "items")) {
    updates.items = normalizeItems(updates.items);
  }

  for (const field of ["subtotal", "tax", "totalAmount"]) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      updates[field] = toNumber(updates[field]);
    }
  }

  return updates;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fallbackExpenseData(errorMessage) {
  return {
    extractedText: "AI extraction was not completed because the AI request failed.",
    imageContextSummary: "Uploaded expense image saved without AI extraction.",
    merchantName: "",
    expenseDate: "",
    items: [],
    subtotal: 0,
    tax: 0,
    totalAmount: 0,
    currency: "",
    paymentMethod: "",
    category: "",
    notes: `AI extraction failed: ${errorMessage}`
  };
}

exports.uploadExpense = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image file" });
    }

    if (!process.env.AI_SERVICE_URL) {
      return res.status(500).json({ message: "AI_SERVICE_URL is not configured" });
    }

    const imagePath = path.resolve(req.file.path);

    let expenseData;
    let aiWarning = null;

    try {
      const aiResponse = await axios.post(process.env.AI_SERVICE_URL, {
        imagePath,
        imageName: req.file.originalname,
        imageMimeType: req.file.mimetype
      });

      expenseData = normalizeExpenseData(aiResponse.data);
    } catch (aiError) {
      const aiMessage = aiError.response?.data?.error || aiError.response?.data?.message || aiError.message;
      expenseData = fallbackExpenseData(aiMessage);
      aiWarning = expenseData.notes;
    }

    const expense = await Expense.create({
      imageName: req.file.originalname,
      imageMimeType: req.file.mimetype,
      imagePath,
      ...expenseData
    });

    return res.status(201).json({
      ...expense.toObject(),
      warning: aiWarning
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to process expense image",
      error: error.response?.data?.error || error.message
    });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const { search, category, fromDate, toDate } = req.query;
    const filter = {};

    if (search) {
      const safeSearch = escapeRegex(search);
      filter.$or = [
        { merchantName: { $regex: safeSearch, $options: "i" } },
        { extractedText: { $regex: safeSearch, $options: "i" } },
        { imageContextSummary: { $regex: safeSearch, $options: "i" } }
      ];
    }

    if (category) {
      filter.category = { $regex: `^${escapeRegex(category)}$`, $options: "i" };
    }

    if (fromDate || toDate) {
      filter.expenseDate = {};

      if (fromDate) {
        filter.expenseDate.$gte = fromDate;
      }

      if (toDate) {
        filter.expenseDate.$lte = toDate;
      }
    }

    const expenses = await Expense.find(filter).sort({ createdAt: -1 });
    return res.json(expenses);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch expenses" });
  }
};

exports.getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.json(expense);
  } catch (error) {
    return res.status(400).json({ message: "Invalid expense id" });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const allowedUpdates = normalizeExpenseUpdates(req.body);

    const expense = await Expense.findByIdAndUpdate(req.params.id, allowedUpdates, {
      new: true,
      runValidators: true
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.json(expense);
  } catch (error) {
    return res.status(400).json({ message: "Failed to update expense" });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    return res.status(400).json({ message: "Failed to delete expense" });
  }
};
