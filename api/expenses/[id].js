const {
  Expense,
  connectToDatabase,
  methodNotAllowed,
  normalizeExpenseUpdates,
  sendJson
} = require("../_utils");

module.exports = async function handler(req, res) {
  try {
    await connectToDatabase();
    const { id } = req.query;

    if (req.method === "GET") {
      const expense = await Expense.findById(id);

      if (!expense) {
        return sendJson(res, 404, { message: "Expense not found" });
      }

      return sendJson(res, 200, expense);
    }

    if (req.method === "PUT") {
      const expense = await Expense.findByIdAndUpdate(id, normalizeExpenseUpdates(req.body), {
        new: true,
        runValidators: true
      });

      if (!expense) {
        return sendJson(res, 404, { message: "Expense not found" });
      }

      return sendJson(res, 200, expense);
    }

    if (req.method === "DELETE") {
      const expense = await Expense.findByIdAndDelete(id);

      if (!expense) {
        return sendJson(res, 404, { message: "Expense not found" });
      }

      return sendJson(res, 200, { message: "Expense deleted successfully" });
    }

    return methodNotAllowed(res);
  } catch (error) {
    return sendJson(res, 400, { message: "Expense request failed", error: error.message });
  }
};
