import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../api";

function ExpenseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    API.get(`/expenses/${id}`)
      .then((response) => {
        setExpense(response.data);
      })
      .catch(() => {
        setMessage("Expense not found");
      });
  }, [id]);

  const handleDelete = async () => {
    try {
      await API.delete(`/expenses/${id}`);
      navigate("/expenses");
    } catch (error) {
      setMessage("Could not delete expense");
    }
  };

  if (message) {
    return <main className="page">{message}</main>;
  }

  if (!expense) {
    return <main className="page">Loading expense...</main>;
  }

  const hasExtractedData = Boolean(
    expense.extractedText ||
      expense.merchantName ||
      expense.expenseDate ||
      expense.totalAmount ||
      expense.category ||
      (expense.items && expense.items.length > 0)
  );

  return (
    <main className="page">
      <section className="panel">
        <div className="page-heading">
          <div>
            <h1>{expense.merchantName || expense.imageName || "Expense Detail"}</h1>
            <p className="muted">
              {expense.imageContextSummary ||
                (!hasExtractedData
                  ? "No expense data was extracted for this image. Delete it and upload a clearer receipt image."
                  : "")}
            </p>
          </div>
          <div className="actions">
            <Link className="button-link" to={`/expenses/${id}/edit`}>
              Edit
            </Link>
            <button className="danger" onClick={handleDelete}>
              Delete
            </button>
          </div>
        </div>

        <dl className="details">
          <div>
            <dt>Total</dt>
            <dd>
              {expense.currency} {expense.totalAmount}
            </dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{expense.expenseDate || "Not found"} </dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>{expense.paymentMethod || "Not found"}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{expense.category || "Not set"}</dd>
          </div>
        </dl>

        {!hasExtractedData && (
          <p className="message">
            Extraction did not return usable data for this image. Try uploading a clearer receipt, bill, or
            payment screenshot.
          </p>
        )}

        <h2>Items</h2>
        {!expense.items || expense.items.length === 0 ? (
          <p className="muted">No item rows were detected.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Qty</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {expense.items.map((item, index) => (
                <tr key={`${item.name}-${index}`}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2>Extracted Text</h2>
        <pre>{expense.extractedText || "No readable text found."}</pre>

        {expense.notes && (
          <>
            <h2>Notes</h2>
            <pre>{expense.notes}</pre>
          </>
        )}
      </section>
    </main>
  );
}

export default ExpenseDetail;
