const { formidable } = require("formidable");
const {
  Expense,
  connectToDatabase,
  extractExpenseWithMistral,
  methodNotAllowed,
  sendJson
} = require("../_utils");

const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

module.exports.config = {
  api: {
    bodyParser: false
  }
};

function parseForm(req) {
  const form = formidable({
    maxFileSize: 5 * 1024 * 1024,
    multiples: false,
    filter: (part) => {
      return part.name === "image" && allowedMimeTypes.includes(part.mimetype);
    }
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });
}

function getUploadedImage(files) {
  const image = files.image;
  return Array.isArray(image) ? image[0] : image;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res);
  }

  try {
    const { files } = await parseForm(req);
    const image = getUploadedImage(files);

    if (!image) {
      return sendJson(res, 400, { message: "Only JPG, JPEG, PNG, and WEBP image files are allowed" });
    }

    await connectToDatabase();
    const expenseData = await extractExpenseWithMistral(image);

    const expense = await Expense.create({
      imageName: image.originalFilename || "uploaded-image",
      imageMimeType: image.mimetype,
      imagePath: `vercel-upload://${image.newFilename || image.originalFilename || Date.now()}`,
      ...expenseData
    });

    return sendJson(res, 201, expense);
  } catch (error) {
    return sendJson(res, 500, { message: "Failed to process expense image", error: error.message });
  }
};
