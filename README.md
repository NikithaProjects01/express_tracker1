# Image Expense Tracker

An image-only expense tracker built with React, Node.js, Express, MongoDB, and Mistral vision models.

Users upload a receipt, bill, invoice, handwritten expense note, or payment screenshot. The backend sends the image to the Python AI service, stores the uploaded image path, extracted text, image context, and structured expense data in MongoDB, and exposes CRUD APIs for the frontend.

## Project Structure

```text
backend/      Express API, MongoDB models, image upload handling
ai-service/   Python Flask service using google-genai
frontend/     React app for upload, list, view, edit, delete
```

## Requirements

- Node.js 18+
- Python 3.11 or 3.12 recommended
- MongoDB running locally or a MongoDB Atlas URI
- Mistral API key

Avoid Python 3.15 for this project right now. Some AI dependencies may not have Windows wheels for it yet.

## Environment Files

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/image_expense_tracker
AI_SERVICE_URL=http://localhost:8000/extract-expense
```

Create `ai-service/.env`:

```env
MISTRAL_API_KEY=your_mistral_api_key_here
MISTRAL_MODEL=pixtral-12b-latest
```

## Install

```bash
cd backend
npm install

cd ../frontend
npm install

cd ../ai-service
pip install -r requirements.txt
```

## Run

Start MongoDB first.

Terminal 1:

```bash
cd ai-service
python extract_expense.py
```

On Windows, if the virtual environment launcher is stale, run with the full Python 3.12 executable:

```powershell
C:\Users\23eg1\AppData\Local\Programs\Python\Python312\python.exe extract_expense.py
```

Terminal 2:

```bash
cd backend
npm run dev
```

Terminal 3:

```bash
cd frontend
npm run dev
```

Open the frontend URL printed by Vite, usually `http://localhost:5173`.

## API

```text
POST   /api/expenses/upload
GET    /api/expenses
GET    /api/expenses/:id
PUT    /api/expenses/:id
DELETE /api/expenses/:id
```

`GET /api/expenses` supports optional query parameters:

```text
search=merchant-or-text
category=food
fromDate=2026-05-01
toDate=2026-05-18
```
