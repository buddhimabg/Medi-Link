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
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", asyncHandler(getTodayReminders));
router.post("/", asyncHandler(createReminder));
router.patch("/:id", asyncHandler(updateReminder));
router.delete("/:id", asyncHandler(deleteReminder));
router.post("/upload-prescription", upload.single("prescription"), asyncHandler(uploadPrescription));

module.exports = router;