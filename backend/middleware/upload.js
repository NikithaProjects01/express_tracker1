const multer = require("multer");
const path = require("path");

const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Only JPG, JPEG, PNG, and WEBP image files are allowed"));
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports = upload;

