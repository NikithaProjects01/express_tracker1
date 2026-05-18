const { Expense, buildExpenseFilter, connectToDatabase, methodNotAllowed, sendJson } = require("../_utils");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res);
  }

  try {
    await connectToDatabase();
    const expenses = await Expense.find(buildExpenseFilter(req.query)).sort({ createdAt: -1 });
    return sendJson(res, 200, expenses);
  } catch (error) {
    return sendJson(res, 500, { message: "Failed to fetch expenses", error: error.message });
  }
};
