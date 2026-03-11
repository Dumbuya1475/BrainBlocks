const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const FUNCTIONS_URL = import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-brainblocks-e3e01.cloudfunctions.net/generateRoadmap';
const CLIENT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

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

function extractJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI did not return valid JSON.');
  return JSON.parse(match[0]);
}

function getRoadmapEndpoint() {
  const trimmedBase = API_BASE_URL.trim();
  if (trimmedBase) {
    return `${trimmedBase.replace(/\/$/, '')}/api/generate-roadmap`;
  }

  if (import.meta.env.DEV) {
    return FUNCTIONS_URL.trim();
  }

  return '/api/generate-roadmap';
}

function validateRoadmap(roadmap, requestedWeeks) {
  if (!roadmap || typeof roadmap !== 'object') throw new Error('Invalid roadmap format.');
  if (!Array.isArray(roadmap.weeks)) throw new Error('Roadmap is missing weeks.');
  if (roadmap.weeks.length !== Number(requestedWeeks) + 1) {
    throw new Error('Roadmap weeks count does not match requested duration.');
  }

  roadmap.weeks.forEach((week, index) => {
    if (typeof week.week !== 'number' || week.week !== index) {
      throw new Error('Roadmap weeks must start at Week 0 and continue in order.');
    }
    if (!Array.isArray(week.tasks) || week.tasks.length === 0) {
      throw new Error(`Week ${index} is missing tasks.`);
    }
  });

  return roadmap;
}

function buildFallbackRoadmap({ moduleName, goal, dailyStudyTime, durationWeeks }) {
  const totalWeeks = Number(durationWeeks);
  const focus = moduleName.trim();
  const target = goal.trim();

  const weeks = Array.from({ length: totalWeeks + 1 }, (_, week) => {
    if (week === 0) {
      return {
        week: 0,
        title: `Week 0 - Setup for ${focus}`,
        tasks: [
          `Define a clear ${focus} study target`,
          `Set up notes, folders, and tools for ${focus}`,
          `Create a ${dailyStudyTime} study routine`,
          `List key topics needed for ${target || focus}`,
        ],
      };
    }

    return {
      week,
      title: `Week ${week} - ${focus} Practice`,
      tasks: [
        `Study the core topic for Week ${week}`,
        `Complete 2 practical exercises in ${focus}`,
        `Write concise notes and summary points`,
        `Review weak areas and plan the next session`,
      ],
    };
  });

  return {
    module: focus,
    goal: target,
    weeks,
    generatedBy: 'fallback',
  };
}

function shouldUseFallback(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('resource_exhausted') ||
    message.includes('quota') ||
    message.includes('429') ||
    message.includes('roadmap proxy returned html') ||
    message.includes('failed to fetch') ||
    message.includes('load failed')
  );
}

async function generateViaGeminiClient({ moduleName, goal, dailyStudyTime, durationWeeks }) {
  if (!CLIENT_API_KEY.trim()) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Add it to your .env file.');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${CLIENT_API_KEY.trim()}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: buildPrompt({ moduleName, goal, dailyStudyTime, durationWeeks }) }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Gemini request failed.');
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return validateRoadmap(extractJson(content), durationWeeks);
}

async function generateViaProxy({ moduleName, goal, dailyStudyTime, durationWeeks }) {
  const endpoint = getRoadmapEndpoint();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      moduleName,
      goal,
      dailyStudyTime,
      durationWeeks,
      model: GEMINI_MODEL,
    }),
  });

  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  if (!response.ok) {
    try {
      const parsed = JSON.parse(rawText);
      throw new Error(parsed?.error || 'Roadmap proxy request failed.');
    } catch {
      throw new Error(rawText || 'Roadmap proxy request failed.');
    }
  }

  if (rawText.trim().startsWith('<!DOCTYPE') || contentType.includes('text/html')) {
    throw new Error('Roadmap proxy returned HTML instead of JSON.');
  }

  return validateRoadmap(JSON.parse(rawText), durationWeeks);
}

export async function generateModuleRoadmap({ moduleName, goal, dailyStudyTime, durationWeeks }) {
  try {
    if (CLIENT_API_KEY.trim()) {
      return await generateViaGeminiClient({ moduleName, goal, dailyStudyTime, durationWeeks });
    }

    return await generateViaProxy({ moduleName, goal, dailyStudyTime, durationWeeks });
  } catch (error) {
    if (shouldUseFallback(error)) {
      return buildFallbackRoadmap({ moduleName, goal, dailyStudyTime, durationWeeks });
    }
    throw error;
  }
}
