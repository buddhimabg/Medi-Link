const express = require("express");
const { asyncHandler } = require("../middlewares/errorMiddleware.js");
const {
	createReminder,
	getTodayReminders,
	updateReminder,
	deleteReminder,
} = require("../controllers/reminderController.js");

const router = express.Router();

router.get("/", asyncHandler(getTodayReminders));
router.post("/", asyncHandler(createReminder));
router.patch("/:id", asyncHandler(updateReminder));
router.delete("/:id", asyncHandler(deleteReminder));

module.exports = router;