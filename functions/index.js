const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

const GROQ_API_KEY = defineSecret('GROQ_API_KEY');
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

function buildPrompt({ moduleName, goal, dailyStudyTime, durationWeeks }) {
  return `You are an expert curriculum designer.

Your task is to generate a structured study roadmap for a student.

The student will provide:
- module name
- goal
- daily study time
- number of weeks

You must return a structured learning roadmap.

Rules:
1. The roadmap must start from Week 0.
2. Include one week entry for every week requested.
3. Each week must contain practical tasks the student can complete.
4. Tasks should be realistic for the given daily study time.
5. Tasks must be concise and action-oriented.
6. Do NOT include explanations.
7. Return ONLY valid JSON.

JSON format required:

{
  "module": "module name",
  "goal": "learning goal",
  "weeks": [
    {
      "week": 0,
      "title": "Week title",
      "tasks": [
        "task 1",
        "task 2",
        "task 3"
      ]
    }
  ]
}

Student input:

Module: ${moduleName}
Goal: ${goal}
Daily Study Time: ${dailyStudyTime}
Duration Weeks: ${durationWeeks}`;
}

function parseJsonBlock(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Groq returned non-JSON output.');
  return JSON.parse(match[0]);
}

function validateRoadmap(roadmap, requestedWeeks) {
  if (!roadmap || typeof roadmap !== 'object') throw new Error('Invalid roadmap object.');
  if (!Array.isArray(roadmap.weeks)) throw new Error('Roadmap is missing weeks.');
  if (roadmap.weeks.length !== Number(requestedWeeks) + 1) {
    throw new Error('Roadmap weeks count does not match requested duration.');
  }
  roadmap.weeks.forEach((week, index) => {
    if (typeof week.week !== 'number' || week.week !== index) {
      throw new Error('Weeks must start from 0 and be sequential.');
    }
    if (!Array.isArray(week.tasks) || week.tasks.length === 0) {
      throw new Error(`Week ${index} has no tasks.`);
    }
  });
  return roadmap;
}

exports.generateRoadmap = onRequest({
  secrets: [GROQ_API_KEY],
  cors: true,
}, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { moduleName, goal, dailyStudyTime, durationWeeks, model } = req.body || {};

    if (!moduleName || !goal || !dailyStudyTime || Number.isNaN(Number(durationWeeks))) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const selectedModel = model || DEFAULT_MODEL;
    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

    const prompt = buildPrompt({
      moduleName,
      goal,
      dailyStudyTime,
      durationWeeks: Number(durationWeeks),
    });

    const groqResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY.value()}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You generate strict JSON study roadmaps only.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      res.status(groqResponse.status || 502).json({ error: errorText || 'Groq request failed' });
      return;
    }

    const payload = await groqResponse.json();
    const content = payload?.choices?.[0]?.message?.content || '';
    const roadmap = validateRoadmap(parseJsonBlock(content), Number(durationWeeks));
    res.status(200).json(roadmap);
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Failed to generate roadmap' });
  }
});
