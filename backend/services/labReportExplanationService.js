const OLLAMA_URL =
  process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "llama3.2";

const USE_OLLAMA =
  String(process.env.USE_OLLAMA_EXPLANATIONS || "false").toLowerCase() === "true";

/**
 * Limits and safety constants (avoids hardcoding inside logic)
 */
const MAX_TEXT_LENGTH = 260;
const NORMALIZE_REGEX = /\s+/g;

/**
 * Cleans AI-generated text for safe UI rendering
 */
const sanitizeModelText = (text = "") => {
  return String(text)
    .replace(NORMALIZE_REGEX, " ") // normalize whitespace
    .trim()
    .slice(0, MAX_TEXT_LENGTH); // prevent UI overflow
};

/**
 * Builds safe medical explanation prompt for AI
 * Keeps response patient-friendly and non-diagnostic
 */
const buildPrompt = (marker) => {
  return [
    "You are writing health education text.",
    "Write 1-2 short neutral sentences for a patient-facing app.",
    `Marker: ${marker.name}`,
    `Value: ${marker.value ?? "not found"}`,
    `Status: ${marker.status}`,
    "",
    "Rules:",
    "- Do NOT provide diagnosis",
    "- Do NOT provide treatment plans",
    "- Do NOT give medication advice",
    "- Use simple, clear, non-technical language",
  ].join("\n");
};

/**
 * Calls Ollama API to generate explanation for a biomarker
 */
const generateWithOllama = async (marker) => {
  const response = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: buildPrompt(marker),
      stream: false,
    }),
  });

  // Fail-safe for API issues
  if (!response.ok) {
    throw new Error(`Ollama call failed with status ${response.status}`);
  }

  const payload = await response.json();

  const rawText = payload?.response || "";

  return sanitizeModelText(rawText);
};

/**
 * Adds AI-generated explanations to biomarkers safely
 * - Does not break system on failure
 * - Skips AI if feature is disabled
 */
const enrichMarkerExplanations = async (markers = []) => {
  // Feature toggle (prevents unnecessary API usage)
  if (!USE_OLLAMA) return markers;

  const enriched = await Promise.all(
    markers.map(async (marker) => {
      try {
        // Generate AI explanation
        const explanation = await generateWithOllama(marker);

        // If empty response, keep original marker
        if (!explanation) return marker;

        // Attach explanation safely
        return {
          ...marker,
          explanation,
        };
      } catch (error) {
        // Never break pipeline if AI fails
        return marker;
      }
    })
  );

  return enriched;
};

module.exports = {
  enrichMarkerExplanations,
};