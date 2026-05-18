import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import EditExpense from "./pages/EditExpense.jsx";
import ExpenseDetail from "./pages/ExpenseDetail.jsx";
import ExpenseList from "./pages/ExpenseList.jsx";
import UploadExpense from "./pages/UploadExpense.jsx";

function App() {
  return (
    <BrowserRouter>
      <nav className="topbar">
        <Link className="brand" to="/">
          Image Expense Tracker
        </Link>
        <div className="nav-links">
          <Link to="/">Upload</Link>
          <Link to="/expenses">Expenses</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<UploadExpense />} />
        <Route path="/expenses" element={<ExpenseList />} />
        <Route path="/expenses/:id" element={<ExpenseDetail />} />
        <Route path="/expenses/:id/edit" element={<EditExpense />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

