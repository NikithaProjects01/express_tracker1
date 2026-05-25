import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

function ExpenseList() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    fromDate: "",
    toDate: ""
  });

  const loadExpenses = async (query = filters) => {
    try {
      setLoading(true);
      setMessage("");

      const params = Object.fromEntries(
        Object.entries(query).filter(([, value]) => value.trim() !== "")
      );

      const response = await API.get("/expenses", { params });
      setExpenses(response.data);
      response.data.forEach((expense) => {
        if (expense?._id) {
          sessionStorage.setItem(`expense:${expense._id}`, JSON.stringify(expense));
        }
      });
    } catch (error) {
      setMessage("Could not load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    loadExpenses(filters);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      search: "",
      category: "",
      fromDate: "",
      toDate: ""
    };

    setFilters(emptyFilters);
    loadExpenses(emptyFilters);
  };

  if (loading) {
    return <main className="page">Loading expenses...</main>;
  }

  return (
    <main className="page">
      <div className="page-heading">
        <h1>Expenses</h1>
        <Link className="button-link" to="/">
          Upload image
        </Link>
      </div>

      {message && <p className="message">{message}</p>}

      <form className="filters" onSubmit={handleFilterSubmit}>
        <label>
          Search
          <input
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Merchant or extracted text"
          />
        </label>

        <label>
          Category
          <input
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            placeholder="Food, travel, utilities"
          />
        </label>

        <label>
          From
          <input name="fromDate" type="date" value={filters.fromDate} onChange={handleFilterChange} />
        </label>

        <label>
          To
          <input name="toDate" type="date" value={filters.toDate} onChange={handleFilterChange} />
        </label>

        <div className="filter-actions">
          <button type="submit">Apply</button>
          <button type="button" className="secondary" onClick={handleClearFilters}>
            Clear
          </button>
        </div>
      </form>

      {expenses.length === 0 ? (
        <section className="panel">
          <p>No expenses saved yet.</p>
        </section>
      ) : (
        <section className="grid">
          {expenses.map((expense) => (
            <article className="card" key={expense._id}>
              <h2>{expense.merchantName || "Unknown Merchant"}</h2>
              <p className="amount">
                {expense.currency} {expense.totalAmount}
              </p>
              <p className="muted">Date: {expense.expenseDate || "Not found"}</p>
              <p className="muted">Category: {expense.category || "Not set"}</p>
              <Link to={`/expenses/${expense._id}`}>View details</Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default ExpenseList;
