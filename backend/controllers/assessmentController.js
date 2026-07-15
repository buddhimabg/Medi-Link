const Assessment = require("../models/Assessment");

// Calculate severity for PHQ-9 (Depression)
const getPHQ9Severity = (score) => {
  if (score <= 4) return "Minimal";
  if (score <= 9) return "Mild";
  if (score <= 14) return "Moderate";
  if (score <= 19) return "Moderately Severe";
  return "Severe";
};

// Calculate severity for GAD-7 (Anxiety)
const getGAD7Severity = (score) => {
  if (score <= 4) return "Minimal";
  if (score <= 9) return "Mild";
  if (score <= 14) return "Moderate";
  return "Severe";
};

// Create a new assessment
const createAssessment = async (req, res) => {
  try {
    const { userId, answers } = req.body;

    if (!userId || !answers || !Array.isArray(answers) || answers.length !== 16) {
      return res.status(400).json({
        success: false,
        message: "Invalid input. userId and an array of 16 answers are required."
      });
    }

    // Convert answers to numbers to be safe
    const numericAnswers = answers.map(Number);

    // PHQ-9 is questions 1-9 (indices 0 to 8)
    const phq9Score = numericAnswers.slice(0, 9).reduce((sum, val) => sum + val, 0);

    // GAD-7 is questions 10-16 (indices 9 to 15)
    const gad7Score = numericAnswers.slice(9, 16).reduce((sum, val) => sum + val, 0);

    const depressionSeverity = getPHQ9Severity(phq9Score);
    const anxietySeverity = getGAD7Severity(gad7Score);

    // Wellness Score = 100 - (totalScore / 48 * 100)
    const overallWellnessScore = Math.max(
      0,
      Math.min(100, Math.round(((48 - (phq9Score + gad7Score)) / 48) * 100))
    );

    // Generate clinical summaries
    let summary = "Your responses suggest you may be experiencing symptoms associated with depression and anxiety. It is important to take care of your mental well-being and consider speaking with a mental health professional.";
    if (depressionSeverity === "Minimal" && anxietySeverity === "Minimal") {
      summary = "Your responses suggest you are currently experiencing minimal symptoms of depression and anxiety. Continue incorporating wellness routines into your daily life.";
    }

    const aiSummary = `Your assessment indicates ${depressionSeverity.toLowerCase()} symptoms of depression and ${anxietySeverity.toLowerCase()} symptoms of anxiety. These feelings are valid, and support is available.`;

    // Personalized Recommendations
    const recommendations = [];
    if (phq9Score >= 5) {
      recommendations.push("Practice 10 minutes of mindfulness meditation daily");
      recommendations.push("Engage in physical activity for at least 20 minutes");
    }
    if (gad7Score >= 5) {
      recommendations.push("Maintain a regular sleep schedule (7-8 hours)");
      recommendations.push("Limit caffeine intake, especially in the afternoon");
    }
    if (phq9Score >= 10 || gad7Score >= 10) {
      recommendations.push("Talk to someone you trust about how you feel");
      recommendations.push("Consider consulting with a mental health professional");
    }
    if (recommendations.length === 0) {
      recommendations.push("Maintain your current healthy routines");
      recommendations.push("Incorporate light reflection or journaling in the evenings");
      recommendations.push("Stay connected with family and friends");
    }

    // Lifestyle suggestions list
    const lifestyleSuggestions = [
      "Exercise",
      "Healthy Diet",
      "Better Sleep",
      "Limit Caffeine",
      "Stay Connected"
    ];

    const assessment = await Assessment.create({
      userId,
      answers: numericAnswers,
      phq9Score,
      gad7Score,
      depressionSeverity,
      anxietySeverity,
      overallWellnessScore,
      summary,
      aiSummary,
      recommendations,
      lifestyleSuggestions
    });

    res.status(201).json({
      success: true,
      data: assessment
    });
  } catch (error) {
    console.error("Create Assessment Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during assessment creation."
    });
  }
};

// Get the latest assessment for a user
const getLatestAssessment = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required."
      });
    }

    const latest = await Assessment.findOne({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: latest
    });
  } catch (error) {
    console.error("Get Latest Assessment Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during retrieving latest assessment."
    });
  }
};

// Get all assessment history for a user
const getAssessmentHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required."
      });
    }

    const history = await Assessment.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error("Get Assessment History Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during retrieving assessment history."
    });
  }
};

module.exports = {
  createAssessment,
  getLatestAssessment,
  getAssessmentHistory
};
