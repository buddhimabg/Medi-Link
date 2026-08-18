const fs = require('fs');
const path = require('path');

const biomarkersFilePath = path.join(__dirname, '../utils/defaultBiomarkers.js');
let biomarkers = require(biomarkersFilePath);

const relevanceMap = {
  "Hemoglobin": "Low levels may be associated with fatigue or reduced energy.",
  "White Blood Cells": "Elevated levels can overlap with stress or immune responses.",
  "Red Blood Cells": "Low levels may be relevant to fatigue, weakness, or low energy.",
  "Platelet Count": "Abnormalities may sometimes relate to physical stress or systemic inflammation.",
  "Hematocrit": "Low levels may be relevant to fatigue or reduced energy.",
  "MCV": "Abnormalities may be associated with nutritional deficiencies that overlap with mood or cognitive symptoms.",
  "MCH": "Abnormalities may be associated with nutritional deficiencies that overlap with fatigue.",
  "MCHC": "Abnormalities may be associated with nutritional deficiencies that overlap with fatigue.",
  "Fasting Blood Sugar": "Fluctuations may be relevant to energy levels, brain fog, or mood stability.",
  "Total Cholesterol": "Extremes may sometimes be associated with mood or cognitive changes over time.",
  "LDL Cholesterol": "Abnormalities may overlap with broader metabolic health, which supports overall cognitive function.",
  "HDL Cholesterol": "Lower levels may be relevant to metabolic health, which supports overall cognitive function.",
  "Triglycerides": "Elevated levels can be relevant to metabolic health, which supports overall cognitive function.",
  "Vitamin D": "Low levels may be associated with low mood, fatigue, and cognitive symptoms.",
  "Vitamin B12": "Low levels may be relevant to fatigue, memory issues, or cognitive symptoms.",
  "TSH": "Thyroid abnormalities may overlap with mood, energy, or concentration-related symptoms.",
  "Creatinine": "Abnormalities may overlap with systemic health affecting energy and fatigue.",
  "ALT": "Liver stress may sometimes be associated with fatigue or lethargy.",
  "AST": "Liver stress may sometimes be associated with fatigue or lethargy."
};

biomarkers = biomarkers.map(bm => {
  return {
    ...bm,
    mentalHealthRelevance: relevanceMap[bm.name] || ""
  };
});

const newBiomarkers = [
  {
    name: "Folate",
    aliases: ["Vitamin B9", "Folic Acid", "Serum Folate"],
    unit: "ng/mL",
    category: "vitamin",
    ranges: { normalMin: 3.0, normalMax: 20.0 },
    thresholds: { low: 3.0, high: 20.0 },
    weight: 0.7,
    recommendations: {
      low: {
        immediate: ["Consult a physician regarding folate supplementation."],
        daily: [
          "Increase intake of leafy greens, beans, and fortified grains.",
          "Maintain a balanced diet."
        ]
      },
      high: {
        immediate: ["Review dietary supplements with your doctor."],
        daily: [
          "Maintain adequate hydration.",
          "Eat a balanced diet."
        ]
      },
      normal: {
        daily: [
          "Continue eating folate-rich foods.",
          "Maintain a healthy lifestyle."
        ]
      }
    },
    explanations: {
      low: "Folate is low, which can impact red blood cell formation and nervous system function.",
      normal: "Folate is within the optimal range, supporting cell division and nervous system health.",
      high: "Folate is elevated, usually harmless if supplemented, but should be evaluated if unsupplemented.",
      notFound: "Folate value could not be determined from the report."
    },
    priority: "medium",
    isActive: true,
    mentalHealthRelevance: "Low levels may be associated with mood changes, fatigue, or cognitive symptoms."
  },
  {
    name: "Ferritin",
    aliases: ["Serum Ferritin", "Iron Storage"],
    unit: "ng/mL",
    category: "blood",
    ranges: { normalMin: 15.0, normalMax: 200.0 },
    thresholds: { low: 15.0, high: 200.0 },
    weight: 0.8,
    recommendations: {
      low: {
        immediate: ["Consult a physician for anemia screening and iron evaluation."],
        daily: [
          "Include iron-rich foods like leafy greens, lentils, and lean red meat.",
          "Pair iron sources with vitamin C for better absorption."
        ]
      },
      high: {
        immediate: ["Consult a physician to evaluate elevated iron storage."],
        daily: [
          "Maintain a balanced diet and regular exercise.",
          "Avoid excessive iron supplementation without medical advice."
        ]
      },
      normal: {
        daily: [
          "Maintain a balanced diet rich in essential nutrients.",
          "Stay consistently hydrated during daily activities."
        ]
      }
    },
    explanations: {
      low: "Ferritin is low, indicating depleted iron stores which can lead to anemia.",
      normal: "Ferritin is within the healthy range, indicating adequate iron storage.",
      high: "Ferritin is elevated, which can be caused by inflammation, infection, or iron overload.",
      notFound: "Ferritin value could not be determined from the report."
    },
    priority: "medium",
    isActive: true,
    mentalHealthRelevance: "Low levels may be associated with fatigue, low energy, or restless legs."
  },
  {
    name: "Magnesium",
    aliases: ["Serum Magnesium", "Mg"],
    unit: "mg/dL",
    category: "blood",
    ranges: { normalMin: 1.7, normalMax: 2.2 },
    thresholds: { low: 1.7, high: 2.2 },
    weight: 0.7,
    recommendations: {
      low: {
        immediate: ["Consult a physician regarding magnesium evaluation."],
        daily: [
          "Include magnesium-rich foods like nuts, seeds, and leafy greens.",
          "Maintain adequate hydration."
        ]
      },
      high: {
        immediate: ["Review dietary supplements and antacids with your doctor."],
        daily: [
          "Maintain adequate hydration.",
          "Eat a balanced diet."
        ]
      },
      normal: {
        daily: [
          "Continue eating a nutrient-dense diet.",
          "Maintain a healthy lifestyle."
        ]
      }
    },
    explanations: {
      low: "Magnesium is low, which can impact muscle and nerve function.",
      normal: "Magnesium is within the optimal range, supporting healthy muscle and nerve function.",
      high: "Magnesium is elevated, often related to excessive supplementation or kidney function.",
      notFound: "Magnesium value could not be determined from the report."
    },
    priority: "medium",
    isActive: true,
    mentalHealthRelevance: "Low levels may overlap with anxiety, fatigue, or sleep disturbances."
  }
];

biomarkers.push(...newBiomarkers);

const fileContent = `const defaultBiomarkers = ${JSON.stringify(biomarkers, null, 2)};\n\nmodule.exports = defaultBiomarkers;\n`;

fs.writeFileSync(biomarkersFilePath, fileContent);
console.log('Successfully updated defaultBiomarkers.js');
