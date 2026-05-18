const {
  Expense,
  buildExpenseFilter,
  connectToDatabase,
  getMemoryExpenses,
  hasCloudMongoUri,
  methodNotAllowed,
  sendJson
} = require("../_utils");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res);
  }

  try {
    const filter = buildExpenseFilter(req.query);

    if (!hasCloudMongoUri()) {
      return sendJson(res, 200, getMemoryExpenses(filter));
    }

    await connectToDatabase();
    const expenses = await Expense.find(filter).sort({ createdAt: -1 });
    return sendJson(res, 200, expenses);
  } catch (error) {
    return sendJson(res, 500, { message: "Failed to fetch expenses", error: error.message });
  }
};
