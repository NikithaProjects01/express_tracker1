import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api";

const initialForm = {
  extractedText: "",
  imageContextSummary: "",
  merchantName: "",
  expenseDate: "",
  subtotal: 0,
  tax: 0,
  totalAmount: 0,
  currency: "",
  paymentMethod: "",
  category: "",
  notes: ""
};

function EditExpense() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");

  useEffect(() => {
    API.get(`/expenses/${id}`)
      .then((response) => {
        setForm({
          ...initialForm,
          ...response.data
        });
      })
      .catch(() => {
        setMessage("Could not load expense");
      });
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await API.put(`/expenses/${id}`, form);
      navigate(`/expenses/${id}`);
    } catch (error) {
      setMessage("Could not save expense");
    }
  };

  return (
    <main className="page">
      <section className="panel">
        <h1>Edit Expense</h1>

        {message && <p className="message">{message}</p>}

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Merchant
            <input name="merchantName" value={form.merchantName || ""} onChange={handleChange} />
          </label>

          <label>
            Date
            <input name="expenseDate" value={form.expenseDate || ""} onChange={handleChange} />
          </label>

          <label>
            Subtotal
            <input name="subtotal" type="number" value={form.subtotal || 0} onChange={handleChange} />
          </label>

          <label>
            Tax
            <input name="tax" type="number" value={form.tax || 0} onChange={handleChange} />
          </label>

          <label>
            Total
            <input
              name="totalAmount"
              type="number"
              value={form.totalAmount || 0}
              onChange={handleChange}
            />
          </label>

          <label>
            Currency
            <input name="currency" value={form.currency || ""} onChange={handleChange} />
          </label>

          <label>
            Payment Method
            <input name="paymentMethod" value={form.paymentMethod || ""} onChange={handleChange} />
          </label>

          <label>
            Category
            <input name="category" value={form.category || ""} onChange={handleChange} />
          </label>

          <label>
            Context Summary
            <textarea
              name="imageContextSummary"
              value={form.imageContextSummary || ""}
              onChange={handleChange}
            />
          </label>

          <label>
            Extracted Text
            <textarea name="extractedText" value={form.extractedText || ""} onChange={handleChange} />
          </label>

          <label>
            Notes
            <textarea name="notes" value={form.notes || ""} onChange={handleChange} />
          </label>

          <button type="submit">Save Expense</button>
        </form>
      </section>
    </main>
  );
}

export default EditExpense;

