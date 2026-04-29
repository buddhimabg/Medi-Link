// Convert mood text to numeric
const getMoodValue = (mood) => {
  const map = { terrible: 2, sad: 4, okay: 6, good: 8, great: 10 };
  return map[mood?.toLowerCase()] ?? 5;
};

// Safe number conversion
const num = (v, def = 5) => {
  const n = Number(v);
  return isNaN(n) ? def : n;
};

// Format date in local timezone
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Mental health score calculation (0–10)
const calculateMentalHealthScore = (m) => {
  const moodValue = getMoodValue(m.mood);
  const sleep = num(m.sleepLevel);
  const energy = num(m.energyLevel);
  const motivation = num(m.motivationLevel);
  const social = num(m.socialInteraction);
  const focus = num(m.focusLevel);
  const anxiety = num(m.anxietyLevel);
  const stress = num(m.stressLevel);

  const positive =
    moodValue * 0.15 +
    sleep * 0.12 +
    energy * 0.10 +
    motivation * 0.10 +
    social * 0.10 +
    focus * 0.08;

  const negative = anxiety * 0.20 + stress * 0.15;

  let score = (positive - negative * 0.5) / 0.75;

  score = Math.max(0, Math.min(10, score));

  return Number(score.toFixed(1));
};

// ✅ FIXED: Recovery score must use REAL moods (not averages)
const calculateRecoveryScore = (moods) => {
  if (!moods.length) return 0;

  let good = 0;
  let total = 0;

  moods.forEach((m) => {
    if (num(m.sleepLevel) >= 7) good++; total++;
    if (num(m.anxietyLevel) <= 4) good++; total++;
    if (num(m.energyLevel) >= 6) good++; total++;
    if (num(m.socialInteraction) >= 5) good++; total++;
    if (m.mood === "good" || m.mood === "great") good++; total++;
    if (num(m.stressLevel) <= 4) good++; total++;
  });

  return Math.round((good / total) * 100);
};

module.exports = {
  getMoodValue,
  num,
  formatDate,
  calculateMentalHealthScore,
  calculateRecoveryScore,
};