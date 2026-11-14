const express = require("express");
const multer = require("multer");
const { asyncHandler } = require("../middlewares/errorMiddleware.js");
const {
	createReminder,
	getTodayReminders,
	updateReminder,
	deleteReminder,
	uploadPrescription,
} = require("../controllers/reminderController.js");

const router = express.Router();

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpg",
  "image/jpeg",
  "image/webp",
];

const prescriptionUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Invalid file type. Only PDF and images (png, jpg, jpeg, webp) are allowed."));
    }
  },
});

const handlePrescriptionUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File is too large. Maximum allowed size is 8 MB." });
    }
    return res.status(400).json({ success: false, message: err.message || "Invalid file upload." });
  }
  next(err);
};

router.get("/", asyncHandler(getTodayReminders));
router.post("/", asyncHandler(createReminder));
router.patch("/:id", asyncHandler(updateReminder));
router.delete("/:id", asyncHandler(deleteReminder));
router.post(
  "/upload-prescription",
  prescriptionUpload.single("prescription"),
  handlePrescriptionUploadError,
  asyncHandler(uploadPrescription)
);

module.exports = router;