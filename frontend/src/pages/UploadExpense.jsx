import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";

const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function UploadExpense() {
  const [image, setImage] = useState(null);
  const [createdExpense, setCreatedExpense] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setCreatedExpense(null);

    if (!selectedFile) {
      setImage(null);
      return;
    }

    if (!allowedTypes.includes(selectedFile.type)) {
      setMessage("Only JPG, JPEG, PNG, and WEBP images are allowed");
      setImage(null);
      return;
    }

    setMessage("");
    setImage(selectedFile);
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!image) {
      setMessage("Please choose an image first");
      return;
    }

    const formData = new FormData();
    formData.append("image", image);

    try {
      setLoading(true);
      setMessage("");

      const response = await API.post("/expenses/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setCreatedExpense(response.data);
      setImage(null);
      setMessage(response.data.warning || "Expense created successfully");
    } catch (error) {
      const apiMessage = error.response?.data?.message || "Upload failed";
      let apiError = error.response?.data?.error;
      
      let errorText = apiMessage;
      if (apiError) {
        if (typeof apiError === "object") {
          apiError = JSON.stringify(apiError);
        }
        errorText = `${apiMessage}: ${apiError}`;
      }
      
      setMessage(errorText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="panel">
        <h1>Upload Expense Image</h1>
        <p className="muted">Upload a receipt, bill, invoice, note, or payment screenshot.</p>

        <form className="form" onSubmit={handleUpload}>
          <label>
            Image file
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
            />
          </label>

          {image && <p className="file-name">Selected: {image.name}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Processing image..." : "Create Expense"}
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        {createdExpense && (
          <div className="result">
            <h2>{createdExpense.merchantName || "Expense saved"}</h2>
            <p>
              Total: {createdExpense.currency} {createdExpense.totalAmount}
            </p>
            <Link to={`/expenses/${createdExpense._id}`}>View expense</Link>
          </div>
        )}
      </section>
    </main>
  );
}

export default UploadExpense;
