// backend/controllers/aiController.js
import OpenAI from 'openai';
import * as pdfParseNS from 'pdf-parse'; // import as namespace to support CJS export interop

const pdfParse = pdfParseNS?.default ?? pdfParseNS; // pdf-parse exports a function via CommonJS

export const generateFlashcards = async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY.' });
    }
    const client = new OpenAI({ apiKey });

    // Accept text from JSON body or multipart form field 'text'
    let sourceText = (req.body && (req.body.text || req.body.content)) || '';

    // If file was uploaded, extract text from it (prefer file content)
    if (req.file) {
      const name = (req.file.originalname || '').toLowerCase();
      const mime = req.file.mimetype || '';
      try {
        if (req.file.buffer) {
          // if multer stored file in memory
          if (mime.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
            sourceText = req.file.buffer.toString('utf8');
          } else if (name.endsWith('.pdf') || mime === 'application/pdf') {
            if (typeof pdfParse === 'function') {
              const data = await pdfParse(req.file.buffer);
              sourceText = (data && data.text) ? data.text : '';
            } else {
              console.warn('pdf-parse not available as function; skipping PDF parse.');
              sourceText = '';
            }
          } else {
            // fallback
            sourceText = req.file.buffer.toString('utf8');
          }
        } else if (req.file.path) {
          // multer saved to disk; read file
          const fs = await import('fs/promises');
          const buf = await fs.readFile(req.file.path);
          if (name.endsWith('.pdf') || mime === 'application/pdf') {
            if (typeof pdfParse === 'function') {
              const data = await pdfParse(buf);
              sourceText = (data && data.text) ? data.text : '';
            }
          } else {
            sourceText = buf.toString('utf8');
          }
        }
      } catch (fileErr) {
        console.error('File parsing error:', fileErr);
        return res.status(400).json({ error: 'Failed to parse uploaded file.' });
      }
    }

    if (!sourceText || sourceText.trim().length < 20) {
      return res.status(400).json({ error: 'No input text provided or text too short.' });
    }

    const systemPrompt = 'You are a helpful study assistant.';
    const userPrompt = `
You are a study assistant. Generate up to 12 clear question–answer pairs from the following text.
- Output MUST be a single JSON array, nothing else.
- Each element must be an object with exactly two fields: "question" and "answer".
- Keep questions concise and focused on key ideas. Keep answers short (one or two sentences).
- Use plain text, no markdown, no explanations outside the JSON.
Text:
"""${sourceText}"""
Return JSON only.
`;

    // call OpenAI (supporting both client versions)
    let raw = null;
    try {
      if (client?.chat?.completions?.create) {
        const resp = await client.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 800
        });
        raw = resp?.choices?.[0]?.message?.content;
      } else if (client?.responses?.create) {
        const resp = await client.responses.create({
          model: 'gpt-3.5-turbo',
          input: `${systemPrompt}\n\n${userPrompt}`,
          temperature: 0.2,
          max_tokens: 800
        });
        raw = (resp?.output || [])
          .map(o => (Array.isArray(o.content) ? o.content.map(c => c.text || '').join('') : ''))
          .join('\n')
          .trim();
        if (!raw) raw = resp?.output?.[0]?.content?.[0]?.text || '';
      } else {
        throw new Error('OpenAI client has no supported completion method.');
      }
    } catch (openaiErr) {
      console.error('OpenAI API error:', openaiErr);
      const detail = {
        message: openaiErr?.message,
        status: openaiErr?.status,
        response: openaiErr?.response?.data || openaiErr?.response || null
      };
      return res.status(502).json({ error: 'OpenAI API error', detail });
    }

    if (!raw) {
      return res.status(500).json({ error: 'No content returned from AI.' });
    }

    const tryParse = (text) => { try { return JSON.parse(text); } catch (e) { return null; } };

    let parsed = tryParse(raw);
    if (!parsed) {
      const start = raw.indexOf('[');
      const end = raw.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end > start) {
        const maybe = raw.slice(start, end + 1);
        parsed = tryParse(maybe);
      }
    }

    if (!parsed) {
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const pairs = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const qaMatch = line.match(/^Q[:\-\s]+(.+)/i);
        const aMatch = lines[i+1] && lines[i+1].match(/^A[:\-\s]+(.+)/i);
        if (qaMatch && aMatch) {
          pairs.push({ question: qaMatch[1].trim(), answer: aMatch[1].trim() });
          i++;
          continue;
        }
        const split = line.split(' - ');
        if (split.length === 2) {
          pairs.push({ question: split[0].trim(), answer: split[1].trim() });
          continue;
        }
        const inlineMatch = line.match(/Question[:\s]+(.+?)\s+Answer[:\s]+(.+)/i);
        if (inlineMatch) {
          pairs.push({ question: inlineMatch[1].trim(), answer: inlineMatch[2].trim() });
        }
      }
      if (pairs.length) parsed = pairs;
    }

    if (!parsed || !Array.isArray(parsed)) {
      console.error('AI output parsing failed. Raw output:', raw);
      return res.status(500).json({ error: 'AI output could not be parsed to JSON array of {question,answer}.', raw });
    }

    const normalized = parsed
      .map(item => {
        if (!item || typeof item !== 'object') return null;
        const q = (item.question || item.q || '').toString().trim();
        const a = (item.answer || item.a || '').toString().trim();
        if (!q || !a) return null;
        return { question: q, answer: a };
      })
      .filter(Boolean);

    if (!normalized.length) {
      console.error('Parsed JSON contained no valid pairs. Parsed:', parsed, 'Raw:', raw);
      return res.status(500).json({ error: 'Parsed JSON contained no valid Q/A pairs.', raw });
    }

    return res.json({ flashcards: normalized });
  } catch (err) {
    console.error('AI generation unexpected error:', err);
    return res.status(500).json({ error: 'Server error generating flashcards', detail: err?.message || String(err) });
  }
};

export default { generateFlashcards };