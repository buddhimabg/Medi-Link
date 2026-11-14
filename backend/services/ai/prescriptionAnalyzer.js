// backend/services/ai/prescriptionAnalyzer.js
const { PDFParse } = require("pdf-parse");
const Tesseract = require("tesseract.js");

const normalizeText = (text = "") =>
  String(text)
    .replace(/\s+/g, " ")
    .trim();

const MEDICAL_KEYWORDS = [
  "rx", "prescription", "dr", "dr.", "doctor", "hospital", "clinic", "patient",
  "medication", "medicine", "pharmacy", "pharmacist", "sig", "disp", "refill",
  "physician", "healthcare", "medical", "treatment", "diagnosis", "md", "mbbs",
  "tab", "tablet", "tablets", "cap", "capsule", "capsules", "pill", "pills",
  "mg", "ml", "mcg", "g", "drops", "syrup", "injection", "iv", "oral", "sublingual",
  "daily", "twice", "thrice", "every", "hours", "morning", "evening", "night",
  "bedtime", "after food", "before food", "with food", "meal", "meals", "once",
  "bid", "tid", "qid", "prn", "dose", "dosage", "take", "intake", "freq"
];

const COMMON_DRUG_NAMES = [
  "amoxicillin", "ibuprofen", "paracetamol", "acetaminophen", "metformin",
  "atorvastatin", "lisinopril", "omeprazole", "amlodipine", "losartan",
  "albuterol", "gabapentin", "hydrochlorothiazide", "sertraline", "simvastatin",
  "montelukast", "escitalopram", "azithromycin", "rosuvastatin", "fluticasone",
  "bupropion", "furosemide", "pantoprazole", "trazodone", "dextromethorphan",
  "cetirizine", "loratadine", "fexofenadine", "diphenhydramine", "aspirin",
  "clopidogrel", "warfarin", "insulin", "levothyroxine", "prednisone",
  "doxycycline", "ciprofloxacin", "cephalexin", "clindamycin", "metronidazole",
  "fluconazole", "valacyclovir", "acyclovir", "allopurinol", "colchicine",
  "sumatriptan", "naproxen", "meloxicam", "celecoxib", "tramadol", "codeine",
  "morphine", "oxycodone", "hydrocodone", "fentanyl", "buprenorphine", "naloxone",
  "diazepam", "lorazepam", "alprazolam", "clonazepam", "zolpidem", "tamsulosin",
  "finasteride", "sildenafil", "tadalafil", "estradiol", "progesterone",
  "testosterone", "alendronate", "calcium", "vitamin", "iron", "folic acid",
  "penicillin", "augmentin", "cipro", "lexapro", "zoloft", "prozac", "advil",
  "tylenol", "lipitor", "plavix", "nexium", "crestor", "synthroid", "ventolin",
  "singulair", "flonase", "panadol", "azithral", "calpol", "gelusil", "saridon",
  "disprin", "allegra", "montair", "telma", "combiflam", "pantocid", "doxovent"
];

const extractTextFromFile = async (fileBuffer, mimeType = "", originalName = "") => {
  const isPdf =
    String(mimeType).toLowerCase().includes("pdf") ||
    String(originalName).toLowerCase().endsWith(".pdf");

  if (isPdf) {
    let parser;
    try {
      parser = new PDFParse({ data: fileBuffer });
      const result = await parser.getText();
      const text = normalizeText(result?.text);
      if (text && text.length >= 15) {
        await parser.destroy();
        return text;
      }

      // If direct text length < 15, it is a scanned PDF (image inside PDF).
      // Render PDF pages into image buffers for Tesseract OCR.
      const screenshot = await parser.getScreenshot({
        scale: 1.8,
        first: 4,
        imageDataUrl: false,
        imageBuffer: true,
      });
      await parser.destroy();

      const pages = (screenshot?.pages || []).map((p) => p?.data).filter(Boolean);
      const textParts = [];
      for (const pageData of pages) {
        try {
          const { data } = await Tesseract.recognize(Buffer.from(pageData), "eng");
          const pageText = normalizeText(data?.text);
          if (pageText) textParts.push(pageText);
        } catch (e) {
          // ignore single page OCR error
        }
      }

      const combinedText = normalizeText(textParts.join("\n"));
      if (combinedText) {
        return combinedText;
      }
    } catch (err) {
      if (parser) {
        await parser.destroy().catch(() => {});
      }
    }
    throw new Error("Could not read or process the uploaded PDF file. Please ensure it is a clear, valid PDF.");
  }

  // Handle standard image files (JPG, PNG, WEBP, etc.)
  try {
    const { data } = await Tesseract.recognize(fileBuffer, "eng");
    return normalizeText(data?.text);
  } catch (err) {
    throw new Error("Could not read or process the uploaded image file. Please ensure it is a valid, readable image.");
  }
};

const extractInstruction = (text = "", drugName = "") => {
  const lines = text.split(/[\.\n\r|;]+/).map(l => l.trim()).filter(Boolean);
  
  const instructionKeywords = [/take\b/i, /tablet/i, /tab\b/i, /capsule/i, /cap\b/i, /pill/i, /syrup/i, /drop/i, /after\b/i, /before\b/i, /with\b/i, /daily\b/i, /times\b/i, /every\b/i, /breakfast/i, /lunch/i, /dinner/i, /meals/i, /food/i, /bedtime/i];
  
  for (const line of lines) {
    if (line.length >= 8 && line.length <= 150) {
      const matchCount = instructionKeywords.filter(re => re.test(line)).length;
      if (matchCount >= 2 || (/^take\b/i.test(line) && matchCount >= 1)) {
        let cleaned = line;
        if (drugName && cleaned.toLowerCase().startsWith(drugName.toLowerCase())) {
          cleaned = cleaned.slice(drugName.length).trim().replace(/^[\-\:\.]+\s*/, "");
        }
        if (cleaned.length >= 5) {
          return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }
      }
    }
  }

  const lower = text.toLowerCase();
  let instruction = "";
  if (/after (meals|food|eating|breakfast|lunch|dinner)/i.test(lower)) {
    if (/breakfast/i.test(lower)) instruction = "Take after breakfast";
    else if (/lunch/i.test(lower)) instruction = "Take after lunch";
    else if (/dinner/i.test(lower)) instruction = "Take after dinner";
    else instruction = "Take after meals";
  } else if (/before (meals|food|eating|breakfast|lunch|dinner)|empty stomach/i.test(lower)) {
    if (/breakfast/i.test(lower)) instruction = "Take before breakfast";
    else if (/lunch/i.test(lower)) instruction = "Take before lunch";
    else if (/dinner/i.test(lower)) instruction = "Take before dinner";
    else instruction = "Take before meals (on empty stomach)";
  } else if (/with (food|meals|water|breakfast|lunch|dinner)/i.test(lower)) {
    if (/breakfast/i.test(lower)) instruction = "Take with breakfast";
    else if (/lunch/i.test(lower)) instruction = "Take with lunch";
    else if (/dinner/i.test(lower)) instruction = "Take with dinner";
    else instruction = "Take with food/water";
  } else if (/bedtime|night|before sleep|hs\b/i.test(lower)) {
    instruction = "Take at bedtime";
  } else if (/as needed|prn\b/i.test(lower)) {
    instruction = "Take as needed";
  } else {
    instruction = "Take as prescribed by doctor";
  }

  const tabMatch = text.match(/(\d+(?:\.\d+)?\s*(?:tablet|tablets|tab|tabs|cap|capsule|capsules|pill|pills|ml|mg|drop|drops))/i);
  if (tabMatch && !instruction.toLowerCase().includes(tabMatch[1].toLowerCase())) {
    const amount = tabMatch[1].toLowerCase();
    if (instruction.toLowerCase().startsWith("take ")) {
      instruction = `Take ${amount} ${instruction.slice(5)}`;
    } else {
      instruction = `Take ${amount} (${instruction})`;
    }
  }

  return instruction.charAt(0).toUpperCase() + instruction.slice(1);
};

const extractDurationDays = (text = "", drugName = "") => {
  let section = text;
  if (drugName) {
    const startIdx = text.toLowerCase().indexOf(drugName.toLowerCase());
    if (startIdx !== -1) {
      section = text.slice(startIdx, startIdx + 350);
    }
  }

  const daysMatch = section.match(/for\s+(\d+)\s*(?:days?|d\b)|x\s*(\d+)\s*(?:days?|d\b)|(\d+)\s*(?:days?|d\b)/i);
  if (daysMatch) {
    const val = Number(daysMatch[1] || daysMatch[2] || daysMatch[3]);
    if (!isNaN(val) && val > 0 && val <= 365) return val;
  }

  const weeksMatch = section.match(/for\s+(\d+)\s*(?:weeks?|wks?|w\b)|x\s*(\d+)\s*(?:weeks?|wks?|w\b)|(\d+)\s*(?:weeks?|wks?)/i);
  if (weeksMatch) {
    const val = Number(weeksMatch[1] || weeksMatch[2] || weeksMatch[3]);
    if (!isNaN(val) && val > 0 && val <= 52) return val * 7;
  }

  const monthsMatch = section.match(/for\s+(\d+)\s*(?:months?|mths?|m\b)|(\d+)\s*(?:months?|mths?)/i);
  if (monthsMatch) {
    const val = Number(monthsMatch[1] || monthsMatch[2]);
    if (!isNaN(val) && val > 0 && val <= 12) return val * 30;
  }

  return 0; // 0 means continuous/ongoing or user can manually set in review
};

const extractFrequencyAndTimes = (text = "", drugName = "", index = 0) => {
  let section = text;
  if (drugName) {
    const startIdx = text.toLowerCase().indexOf(drugName.toLowerCase());
    if (startIdx !== -1) {
      section = text.slice(startIdx, startIdx + 350);
    }
  }
  const lower = section.toLowerCase();

  // 1. Check interval / multi-dose patterns first
  if (/\b(every 4 hours|q4h|4 hourly|6 times|six times)\b/i.test(lower)) {
    return { frequency: "daily", times: ["06:00", "10:00", "14:00", "18:00", "22:00", "02:00"], label: "Every 4 Hours (6 times daily)" };
  }
  if (/\b(every 6 hours|q6h|6 hourly|4 times|four times|qid|q\.i\.d|1-1-1-1)\b/i.test(lower)) {
    return { frequency: "daily", times: ["06:00", "12:00", "18:00", "00:00"], label: "Every 6 Hours (4 times daily)" };
  }
  if (/\b(every 8 hours|q8h|8 hourly|tid|t\.i\.d|thrice|3 times|three times|1-1-1)\b/i.test(lower)) {
    return { frequency: "daily", times: ["08:00", "14:00", "20:00"], label: "Three Times Daily (Every 8 Hours)" };
  }
  if (/\b(every 12 hours|q12h|12 hourly|bid|b\.i\.d|twice|2 times|two times|1-0-1|morning and night|morning and evening|morning & evening|morning & night)\b/i.test(lower)) {
    return { frequency: "daily", times: ["08:00", "20:00"], label: "Twice Daily (Every 12 Hours)" };
  }
  if (/\b(stat|once|one time|single dose|immediately)\b/i.test(lower) && !/\bonce daily\b/i.test(lower)) {
    return { frequency: "once", times: ["08:00"], label: "Once (Stat)" };
  }

  // 2. Check specific time-of-day / meal patterns for single daily doses
  if (/\b(breakfast|morning|in the morning|every morning|am dose|1-0-0|after breakfast|before breakfast|with breakfast)\b/i.test(lower)) {
    return { frequency: "daily", times: ["08:00"], label: "Daily (Morning / Breakfast)" };
  }
  if (/\b(lunch|noon|afternoon|midday|0-1-0|after lunch|before lunch|with lunch)\b/i.test(lower)) {
    return { frequency: "daily", times: ["13:00"], label: "Daily (Noon / Lunch)" };
  }
  if (/\b(dinner|supper|evening|in the evening|every evening|pm dose|0-0-1|after dinner|before dinner|with dinner)\b/i.test(lower)) {
    return { frequency: "daily", times: ["20:00"], label: "Daily (Evening / Dinner)" };
  }
  if (/\b(bedtime|night|at night|before sleep|every night|hs\b)\b/i.test(lower)) {
    return { frequency: "daily", times: ["21:00"], label: "Daily (Bedtime / Night)" };
  }

  // 3. Default daily slot distribution
  const defaultSlots = ["08:00", "20:00", "14:00"];
  return { frequency: "daily", times: [defaultSlots[index % defaultSlots.length]], label: "Daily" };
};

/**
 * Service to perform OCR and parsing of a prescription image or PDF.
 * Validates that the uploaded document is actually a medical prescription before generating reminders.
 */
const analyzePrescription = async (fileBuffer, mimeType = "", originalName = "") => {
  if (!fileBuffer) {
    throw new Error("No file buffer provided for prescription analysis.");
  }

  const extractedText = await extractTextFromFile(fileBuffer, mimeType, originalName);
  const lowerText = (extractedText || "").toLowerCase();

  // 1. Validation: check if the text represents a valid prescription
  if (lowerText.length < 10) {
    throw new Error("Invalid prescription image. We could not detect readable text in the uploaded image. Please upload a clear picture of a prescription.");
  }

  let drugNameMatches = 0;
  const foundDrugs = [];
  for (const drug of COMMON_DRUG_NAMES) {
    const drugRegex = new RegExp(`\\b${drug}\\b`, "i");
    if (drugRegex.test(lowerText)) {
      drugNameMatches++;
      foundDrugs.push(drug.charAt(0).toUpperCase() + drug.slice(1));
    }
  }

  let medicalKeywordMatches = 0;
  for (const kw of MEDICAL_KEYWORDS) {
    const kwRegex = new RegExp(`\\b${kw.replace(/\./g, "\\.")}\\b`, "i");
    if (kwRegex.test(lowerText)) {
      medicalKeywordMatches++;
    }
  }

  const dosagePatternMatch = /\b\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|tab|tabs|tablet|tablets|cap|caps|capsule|capsules)\b/i.test(lowerText);

  // A valid prescription must have either a known drug name, a dosage pattern + medical keyword, or at least 3 medical keywords
  const isValidPrescription =
    drugNameMatches > 0 ||
    (dosagePatternMatch && medicalKeywordMatches >= 1) ||
    medicalKeywordMatches >= 3;

  if (!isValidPrescription) {
    throw new Error("Invalid prescription image. We could not detect any prescription or medication details in the uploaded file. Please ensure you upload a clear picture of a medical prescription.");
  }

  // 2. Extract medication reminders from the validated prescription text
  const detectedReminders = [];
  const todayYmd = new Date().toISOString().split("T")[0];

  if (foundDrugs.length > 0) {
    foundDrugs.forEach((drug, index) => {
      const drugLower = drug.toLowerCase();
      const startIdx = lowerText.indexOf(drugLower);
      const drugSection = startIdx !== -1 ? lowerText.slice(startIdx, startIdx + 350) : lowerText;

      const dosageMatch = drugSection.match(/(\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|tab|cap|pill))/i) ||
                          lowerText.match(/(\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g))/i);
      const dosage = dosageMatch ? ` ${dosageMatch[1].trim()}` : "";
      
      const instr = extractInstruction(drugSection || lowerText, drug);
      const durationDays = extractDurationDays(drugSection || lowerText, drug);
      const { frequency, times, label } = extractFrequencyAndTimes(drugSection || lowerText, drug, index);

      if (times.length === 1) {
        detectedReminders.push({
          title: `Take ${drug}${dosage}`,
          description: `Prescription medication extracted from OCR (${drug})`,
          instruction: instr,
          durationDays,
          category: "meditation",
          time: times[0],
          frequency: frequency,
          date: frequency === "once" ? todayYmd : undefined,
        });
      } else {
        const timeLabels = {
          "06:00": "Morning (6 AM)", "08:00": "Morning (8 AM)", "10:00": "Morning (10 AM)",
          "12:00": "Noon (12 PM)", "13:00": "Noon (1 PM)", "14:00": "Afternoon (2 PM)", "16:00": "Afternoon (4 PM)",
          "18:00": "Evening (6 PM)", "20:00": "Evening (8 PM)", "21:00": "Night (9 PM)", "22:00": "Night (10 PM)",
          "00:00": "Midnight (12 AM)", "02:00": "Night (2 AM)"
        };
        times.forEach((tStr, idx) => {
          const slotName = timeLabels[tStr] || `Slot ${idx + 1} (${tStr})`;
          detectedReminders.push({
            title: `Take ${drug}${dosage} [${slotName}]`,
            description: `Prescription medication (${label}) - ${drug}`,
            instruction: instr,
            durationDays,
            category: "meditation",
            time: tStr,
            frequency: frequency,
          });
        });
      }
    });
  } else {
    const defaultInstr = extractInstruction(extractedText);
    const defaultDuration = extractDurationDays(extractedText) || 0;
    const dosageMatches = extractedText.match(/([A-Za-z0-9\-]+)\s+(\d+(?:\.\d+)?\s*(?:mg|ml|mcg|g|tab|cap|pill|iu))/ig);
    if (dosageMatches && dosageMatches.length > 0) {
      dosageMatches.slice(0, 5).forEach((matchStr, index) => {
        const drugName = matchStr.split(/\s+/)[0];
        const instr = extractInstruction(extractedText, drugName) || defaultInstr;
        const durationDays = extractDurationDays(extractedText, drugName) || defaultDuration;
        const { frequency, times, label } = extractFrequencyAndTimes(extractedText, drugName, index);

        if (times.length === 1) {
          detectedReminders.push({
            title: `Take ${matchStr.trim()}`,
            description: "Prescription medication extracted from OCR",
            instruction: instr,
            durationDays,
            category: "meditation",
            time: times[0],
            frequency: frequency,
          });
        } else {
          const timeLabels = {
            "06:00": "Morning (6 AM)", "08:00": "Morning (8 AM)", "10:00": "Morning (10 AM)",
            "12:00": "Noon (12 PM)", "13:00": "Noon (1 PM)", "14:00": "Afternoon (2 PM)", "16:00": "Afternoon (4 PM)",
            "18:00": "Evening (6 PM)", "20:00": "Evening (8 PM)", "21:00": "Night (9 PM)", "22:00": "Night (10 PM)",
            "00:00": "Midnight (12 AM)", "02:00": "Night (2 AM)"
          };
          times.forEach((tStr, idx) => {
            const slotName = timeLabels[tStr] || `Slot ${idx + 1} (${tStr})`;
            detectedReminders.push({
              title: `Take ${matchStr.trim()} [${slotName}]`,
              description: `Prescription medication (${label})`,
              instruction: instr,
              durationDays,
              category: "meditation",
              time: tStr,
              frequency: frequency,
            });
          });
        }
      });
    } else {
      const { frequency, times, label } = extractFrequencyAndTimes(extractedText, "", 0);
      const timeLabels = {
        "08:00": "Morning (8 AM)", "13:00": "Noon (1 PM)", "14:00": "Afternoon (2 PM)",
        "20:00": "Evening (8 PM)", "21:00": "Night (9 PM)"
      };
      if (times.length === 1) {
        detectedReminders.push({
          title: "Take Prescribed Medication (Daily Dose)",
          description: "Prescription medication (auto-generated from OCR review)",
          instruction: defaultInstr || "Take 1 tablet after meals",
          durationDays: defaultDuration,
          category: "meditation",
          time: times[0],
          frequency: frequency,
        });
      } else {
        times.forEach((tStr, idx) => {
          const slotName = timeLabels[tStr] || `Slot ${idx + 1} (${tStr})`;
          detectedReminders.push({
            title: `Take Prescribed Medication [${slotName}]`,
            description: `Prescription medication (${label})`,
            instruction: defaultInstr || "Take 1 tablet after meals",
            durationDays: defaultDuration,
            category: "meditation",
            time: tStr,
            frequency: frequency,
          });
        });
      }
    }
  }

  return detectedReminders;
};

module.exports = {
  analyzePrescription,
};
