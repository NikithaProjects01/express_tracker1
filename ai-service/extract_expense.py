import base64
import json
import mimetypes
import os
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env", override=True)

app = Flask(__name__)

MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"


def empty_expense():
    return {
        "extractedText": "",
        "imageContextSummary": "",
        "merchantName": "",
        "expenseDate": "",
        "items": [],
        "subtotal": 0,
        "tax": 0,
        "totalAmount": 0,
        "currency": "",
        "paymentMethod": "",
        "category": "",
        "notes": "",
    }


def clean_json_text(text):
    cleaned = (text or "").strip()

    if cleaned.startswith("```json"):
        cleaned = cleaned.replace("```json", "", 1).strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```", "", 1).strip()

    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()

    return cleaned


def image_to_data_url(image_file):
    mime_type, _ = mimetypes.guess_type(image_file)
    mime_type = mime_type or "image/png"

    with open(image_file, "rb") as file:
        encoded_image = base64.b64encode(file.read()).decode("utf-8")

    return f"data:{mime_type};base64,{encoded_image}"


def normalize_items(items):
    if not isinstance(items, list):
        return []

    normalized = []
    for item in items:
        if not isinstance(item, dict):
            continue

        normalized.append(
            {
                "name": str(item.get("name") or ""),
                "quantity": item.get("quantity") or 1,
                "price": item.get("price") or 0,
            }
        )

    return normalized


def normalize_result(parsed):
    result = empty_expense()

    if isinstance(parsed, dict):
        result.update(parsed)

    result["items"] = normalize_items(result.get("items"))
    return result


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/config-check", methods=["GET"])
def config_check():
    load_dotenv(BASE_DIR / ".env", override=True)
    key = os.getenv("MISTRAL_API_KEY") or ""

    return jsonify(
        {
            "envFile": str(BASE_DIR / ".env"),
            "mistralApiKeyPresent": bool(key),
            "mistralApiKeyLength": len(key),
            "mistralModel": os.getenv("MISTRAL_MODEL", "pixtral-12b-latest"),
        }
    )


@app.route("/", methods=["GET"])
def index():
    return jsonify(
        {
            "service": "Mistral expense image extraction service",
            "status": "running",
            "health": "/health",
            "extractEndpoint": "/extract-expense",
        }
    )


@app.route("/extract-expense", methods=["POST"])
def extract_expense():
    try:
        load_dotenv(BASE_DIR / ".env", override=True)
        api_key = os.getenv("MISTRAL_API_KEY")
        model_name = os.getenv("MISTRAL_MODEL", "pixtral-12b-latest")

        if not api_key:
            return jsonify({"message": "MISTRAL_API_KEY is missing in ai-service/.env"}), 500

        data = request.get_json(silent=True) or {}
        image_path = data.get("imagePath")

        if not image_path:
            return jsonify({"message": "imagePath is required"}), 400

        image_file = Path(image_path)

        if not image_file.exists():
            return jsonify({"message": "Image file was not found"}), 404

        prompt = """
Analyze this expense image and return ONLY valid JSON.

Expected JSON shape:
{
  "extractedText": "",
  "imageContextSummary": "",
  "merchantName": "",
  "expenseDate": "",
  "items": [
    {
      "name": "",
      "quantity": 1,
      "price": 0
    }
  ],
  "subtotal": 0,
  "tax": 0,
  "totalAmount": 0,
  "currency": "",
  "paymentMethod": "",
  "category": "",
  "notes": ""
}

Rules:
- extractedText must contain all readable visible text from the image.
- imageContextSummary must briefly explain what the image appears to be.
- Use empty strings or 0 when a value is not visible.
- Use ISO format YYYY-MM-DD for expenseDate if a date is visible.
- Use a reasonable category only if it is clear from the image.
- Do not include markdown, comments, or explanations.
"""

        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": image_to_data_url(image_file)},
                    ],
                }
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        }

        response = requests.post(
            MISTRAL_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=60,
        )

        if not response.ok:
            return jsonify(
                {
                    "message": "Mistral extraction failed",
                    "error": response.text,
                }
            ), response.status_code

        response_data = response.json()
        content = response_data["choices"][0]["message"]["content"]
        parsed = json.loads(clean_json_text(content))

        return jsonify(normalize_result(parsed))

    except json.JSONDecodeError:
        return jsonify(
            {
                "message": "AI returned text, but it was not valid JSON",
                "error": "Try uploading a clearer image",
            }
        ), 502
    except Exception as error:
        return jsonify({"message": "AI extraction failed", "error": str(error)}), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000, debug=True)
