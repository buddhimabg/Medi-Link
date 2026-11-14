const Biomarker = require("../models/biomarker.js");
const { apiSuccess, apiFail } = require("../utils/apiResponse.js");

/*
 Patient-level controller:
 Biomarker master data is read-only for patients.
 Only view endpoints are kept here.
*/

const getAllBiomarkers = async (req, res) => {
  try {
    const biomarkers = await Biomarker.find({ isActive: true })
      .sort({ name: 1 }) // A-Z by biomarker name
      .lean(); // faster read-only query

    return res.json(
      apiSuccess({ biomarkers }, "Biomarkers retrieved successfully")
    );
  } catch (error) {
    return res
      .status(500)
      .json(apiFail("Failed to retrieve biomarkers", error.message));
  }
};

const getBiomarkerById = async (req, res) => {
  try {
    const biomarker = await Biomarker.findOne({
      _id: req.params.id,
      isActive: true,
    }).lean();

    // if record not found or inactive
    if (!biomarker) {
      return res.status(404).json(apiFail("Biomarker not found"));
    }

    return res.json(
      apiSuccess({ biomarker }, "Biomarker retrieved successfully")
    );
  } catch (error) {
    return res
      .status(500)
      .json(apiFail("Failed to retrieve biomarker", error.message));
  }
};

module.exports = {
  getAllBiomarkers,
  getBiomarkerById,
};