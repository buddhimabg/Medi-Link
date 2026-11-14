const express = require("express");
const {
  getAllBiomarkers,
  getBiomarkerById,
} = require("../controllers/biomarkerController.js");

const router = express.Router();

router.get("/", getAllBiomarkers);

router.get("/:id", getBiomarkerById);

module.exports = router;
