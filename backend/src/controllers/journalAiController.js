const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const MODEL_NAME = 'gemini-3.1-flash-lite';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retries a Gemini call a few times if the model is temporarily overloaded (503)
async function generateWithRetry(model, prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      const is503 = error?.status === 503 || /503|overloaded|unavailable/i.test(error?.message || '');
      if (is503 && attempt < retries) {
        await sleep(attempt * 1500); // 1.5s, 3s, 4.5s backoff
        continue;
      }
      throw error;
    }
  }
}

// POST /api/journals/ai/generate
// Body: { prompt: string, title?: string, category?: string }
// Generates draft article content for a doctor's journal article using Gemini.
exports.generateContent = async (req, res) => {
  try {
    const { prompt, title, category } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    if (!genAI) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured on the server. Add it to backend/.env',
      });
    }

    const systemPrompt = `You are a medical writing assistant helping a doctor draft a patient-facing educational journal article for a telehealth platform (Medi-Link).
Write clear, empathetic, medically accurate content suitable for patients (not clinicians).
Return ONLY the article body content in clean plain text, organized into short paragraphs separated by blank lines.
Do not include a title heading in the output — only the body content.
Keep it focused, practical, and around 200-350 words unless the prompt asks otherwise.`;

    const userPrompt = [
      title ? `Article title: ${title}` : null,
      category ? `Category: ${category}` : null,
      `Instruction: ${prompt}`,
    ].filter(Boolean).join('\n');

    const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction: systemPrompt });
    const result = await generateWithRetry(model, userPrompt);
    const generatedText = result.response.text();

    res.status(200).json({ success: true, data: { content: generatedText } });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ success: false, message: error.message || 'AI generation failed' });
  }
};

// POST /api/journals/ai/topics
// Body: { category?: string }
// Suggests topic ideas for a new article.
exports.suggestTopics = async (req, res) => {
  try {
    const { category } = req.body;

    if (!genAI) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY is not configured on the server. Add it to backend/.env',
      });
    }

    const userPrompt = `Suggest 5 short, specific patient-education article topic ideas${category ? ` in the category "${category}"` : ''} for a telehealth mental/physical health platform. Return ONLY a JSON array of 5 short strings, nothing else — no markdown, no code fences.`;

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await generateWithRetry(model, userPrompt);
    let text = result.response.text().trim();

    // Strip markdown code fences if Gemini adds them despite instructions
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

    let topics = [];
    try {
      topics = JSON.parse(text);
    } catch {
      topics = text.split('\n').map(t => t.replace(/^[-*\d.]+\s*/, '').trim()).filter(Boolean).slice(0, 5);
    }

    res.status(200).json({ success: true, data: { topics } });
  } catch (error) {
    console.error('AI topic suggestion error:', error);
    res.status(500).json({ success: false, message: error.message || 'AI topic suggestion failed' });
  }
};
