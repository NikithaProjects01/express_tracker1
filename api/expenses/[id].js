const {
  Expense,
  connectToDatabase,
  deleteMemoryExpense,
  getMemoryExpense,
  hasCloudMongoUri,
  methodNotAllowed,
  normalizeExpenseUpdates,
  sendJson,
  updateMemoryExpense
} = require("../_utils");

module.exports = async function handler(req, res) {
  try {
    const { id } = req.query;
    const useMemory = !hasCloudMongoUri();

    if (!useMemory) {
      await connectToDatabase();
    }

    if (req.method === "GET") {
      const expense = useMemory ? getMemoryExpense(id) : await Expense.findById(id);

      if (!expense) {
        return sendJson(res, 404, { message: "Expense not found" });
      }

      return sendJson(res, 200, expense);
    }

    if (req.method === "PUT") {
      const updates = normalizeExpenseUpdates(req.body);
      const expense = useMemory
        ? updateMemoryExpense(id, updates)
        : await Expense.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true
          });

      if (!expense) {
        return sendJson(res, 404, { message: "Expense not found" });
      }

      return sendJson(res, 200, expense);
    }

    if (req.method === "DELETE") {
      const expense = useMemory ? deleteMemoryExpense(id) : await Expense.findByIdAndDelete(id);

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
