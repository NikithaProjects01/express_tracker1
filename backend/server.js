const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");
const expenseRoutes = require("./routes/expenseRoutes");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

fs.mkdirSync("uploads", { recursive: true });

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/expenses", expenseRoutes);

app.use((error, req, res, next) => {
  if (error.message) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(500).json({ message: "Something went wrong" });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(port, () => {
      console.log(`Backend running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });
