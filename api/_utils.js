const fs = require("fs/promises");
const mongoose = require("mongoose");
const Expense = require("../backend/models/Expense");

let connectionPromise = null;
const memoryStore = globalThis.__expenseMemoryStore || {
  expenses: []
};
globalThis.__expenseMemoryStore = memoryStore;

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function methodNotAllowed(res) {
  sendJson(res, 405, { message: "Method not allowed" });
}

async function connectToDatabase() {
  if (!hasCloudMongoUri()) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI);
  }

  return connectionPromise;
}

function hasCloudMongoUri() {
  const uri = process.env.MONGODB_URI || "";
  return uri.startsWith("mongodb+srv://") || (uri.startsWith("mongodb://") && !uri.includes("127.0.0.1") && !uri.includes("localhost"));
}

function createMemoryExpense(data) {
  const now = new Date().toISOString();
  const expense = {
    _id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...data,
    createdAt: now,
    updatedAt: now
  };

  memoryStore.expenses.unshift(expense);
  return expense;
}

function getMemoryExpenses(filter = {}) {
  let expenses = [...memoryStore.expenses];

  if (filter.$or?.length) {
    const regex = filter.$or[0].merchantName.$regex;
    const matcher = new RegExp(regex, "i");
    expenses = expenses.filter((expense) => (
      matcher.test(expense.merchantName || "") ||
      matcher.test(expense.extractedText || "") ||
      matcher.test(expense.imageContextSummary || "")
    ));
  }

  if (filter.category?.$regex) {
    const matcher = new RegExp(filter.category.$regex, "i");
    expenses = expenses.filter((expense) => matcher.test(expense.category || ""));
  }

  if (filter.expenseDate?.$gte) {
    expenses = expenses.filter((expense) => (expense.expenseDate || "") >= filter.expenseDate.$gte);
  }

  if (filter.expenseDate?.$lte) {
    expenses = expenses.filter((expense) => (expense.expenseDate || "") <= filter.expenseDate.$lte);
  }

  return expenses;
}

function getMemoryExpense(id) {
  return memoryStore.expenses.find((expense) => expense._id === id);
}

function updateMemoryExpense(id, updates) {
  const expense = getMemoryExpense(id);

  if (!expense) {
    return null;
  }

  Object.assign(expense, updates, { updatedAt: new Date().toISOString() });
  return expense;
}

function deleteMemoryExpense(id) {
  const index = memoryStore.expenses.findIndex((expense) => expense._id === id);

  if (index === -1) {
    return null;
  }

  const [expense] = memoryStore.expenses.splice(index, 1);
  return expense;
}

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

function normalizeExpenseData(data = {}) {
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

function normalizeExpenseUpdates(data = {}) {
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

function buildExpenseFilter(query = {}) {
  const { search, category, fromDate, toDate } = query;
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

  return filter;
}

function cleanJsonText(text) {
  let cleaned = (text || "").trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace("```json", "").trim();
  }

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace("```", "").trim();
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3).trim();
  }

  return cleaned;
}

async function extractExpenseWithMistral(file) {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY is not configured");
  }

  let buffer;
  try {
    buffer = await fs.readFile(file.filepath);
  } catch (readError) {
    throw new Error(`Failed to read uploaded file: ${readError.message}`);
  }

  const mimeType = file.mimetype || "image/png";
  const imageUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

  const prompt = `
Analyze this expense image and return ONLY valid JSON.

Expected JSON shape:
{
  "extractedText": "",
  "imageContextSummary": "",
  "merchantName": "",
  "expenseDate": "",
  "items": [{ "name": "", "quantity": 1, "price": 0 }],
  "subtotal": 0,
  "tax": 0,
  "totalAmount": 0,
  "currency": "",
  "paymentMethod": "",
  "category": "",
  "notes": ""
}

Rules:
- extractedText must contain all readable visible text from the image.
- imageContextSummary must briefly explain what the image appears to be.
- Use empty strings or 0 when a value is not visible.
- Use ISO format YYYY-MM-DD for expenseDate if a date is visible.
- Use a reasonable category only if it is clear from the image.
- Do not include markdown, comments, or explanations.
`;

  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.MISTRAL_MODEL || "pixtral-12b-latest",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: imageUrl }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    })
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error?.message || "Mistral extraction failed");
  }

  const content = responseData.choices?.[0]?.message?.content || "{}";
  try {
    return normalizeExpenseData(JSON.parse(cleanJsonText(content)));
  } catch (parseError) {
    throw new Error(`Failed to parse Mistral response: ${parseError.message}`);
  }
}

module.exports = {
  Expense,
  buildExpenseFilter,
  connectToDatabase,
  createMemoryExpense,
  deleteMemoryExpense,
  extractExpenseWithMistral,
  getMemoryExpense,
  getMemoryExpenses,
  hasCloudMongoUri,
  methodNotAllowed,
  normalizeExpenseUpdates,
  sendJson,
  updateMemoryExpense
};
