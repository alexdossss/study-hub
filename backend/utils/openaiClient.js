import OpenAI from 'openai';

/**
 * Uses the OpenAI JS SDK v4+.
 * Ensure your package.json has "openai" updated and OPENAI_API_KEY is set in .env.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * generateQuizFromText
 * @param {String} contextText - text to use as context for quiz generation
 * @param {Number} numQuestions - desired number of questions (max 20)
 * @returns {Object} { title, questions: [{questionText, choices, correctAnswer}, ...] }
 */
export async function generateQuizFromText(contextText, numQuestions = 5) {
  const n = Math.min(20, Math.max(1, Number(numQuestions) || 5));

  const systemPrompt = `You are a helpful assistant that generates multiple-choice quizzes in strict JSON only.
Return a JSON object exactly like:
{
  "title": "Short quiz title",
  "questions": [
    {
      "questionText": "...",
      "choices": ["...", "...", "...", "..."],
      "correctAnswer": "..."
    }
  ]
}
Each question must have 3-4 choices. Ensure exactly n questions (n=${n}). Use the provided context for question content. Do not include any extra commentary or backticks.`;

  const userPrompt = `Context:
${contextText}

Generate ${n} questions.`;

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1600
    });

    const raw = resp?.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Empty response from OpenAI');

    // Extract JSON substring if assistant added text
    let json;
    try {
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      const candidate = firstBrace >= 0 && lastBrace >= 0 ? raw.slice(firstBrace, lastBrace + 1) : raw;
      json = JSON.parse(candidate);
    } catch (err) {
      try {
        json = JSON.parse(raw);
      } catch (err2) {
        throw new Error('Failed to parse OpenAI response as JSON');
      }
    }

    if (!json.title) json.title = 'Generated Quiz';
    if (!Array.isArray(json.questions)) throw new Error('Invalid questions format from OpenAI');

    json.questions = json.questions.slice(0, n).map((q) => {
      const qText = q.questionText || q.question || 'Question text missing';
      const choices = Array.isArray(q.choices) ? q.choices.slice(0, 4) : [];
      return {
        questionText: qText,
        choices: choices.length ? choices : ['Option 1', 'Option 2', 'Option 3'],
        correctAnswer: q.correctAnswer || choices[0] || 'Option 1'
      };
    });

    return json;
  } catch (err) {
    // bubble up error for controller to handle
    throw err;
  }
}

export default { generateQuizFromText };