const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadsDir = path.resolve("uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext || ".bin";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const allowedMimeTypes = new Set([
  "application/pdf",
]);

const fileFilter = (_req, file, cb) => {
  const isPdf =
    file.mimetype === "application/pdf" ||
    /\.pdf$/i.test(file.originalname || "");

  if (isPdf) {
    cb(null, true);
    return;
  }
  const err = new Error("Unsupported file type. Please upload a PDF lab report.");
  err.code = "UNSUPPORTED_FILE_TYPE";
  err.statusCode = 400;
  cb(err);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
});

module.exports = upload;
