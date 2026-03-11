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

function getTopicTemplates(moduleName, goal) {
  const topic = `${moduleName} ${goal}`.toLowerCase();

  if (/(web|html|css|javascript|react|frontend|backend)/.test(topic)) {
    return [
      {
        title: 'Foundations & setup',
        tasks: ['Set up the project workspace', 'Learn the core syntax and structure', 'Build a basic page or starter screen', 'Write setup notes and commands'],
      },
      {
        title: 'Core concepts',
        tasks: ['Study layouts and reusable components', 'Practice forms and user input', 'Build a small interactive feature', 'Review errors and refactor'],
      },
      {
        title: 'Data & integration',
        tasks: ['Connect data to the interface', 'Handle loading and empty states', 'Test data flow with sample records', 'Document the integration steps'],
      },
      {
        title: 'Project sprint',
        tasks: ['Build a mini feature from start to finish', 'Polish styling and usability', 'Fix bugs from manual testing', 'Prepare a short demo summary'],
      },
    ];
  }

  if (/(sql|database|mysql|postgres|db|query)/.test(topic)) {
    return [
      {
        title: 'Database setup',
        tasks: ['Set up the database environment', 'Create core tables and fields', 'Insert sample records', 'Verify data with simple queries'],
      },
      {
        title: 'Query practice',
        tasks: ['Practice SELECT and WHERE queries', 'Use ORDER BY and LIMIT', 'Write UPDATE and DELETE queries safely', 'Summarize query patterns'],
      },
      {
        title: 'Relationships & joins',
        tasks: ['Model table relationships', 'Practice JOIN queries', 'Add constraints and keys', 'Test data integrity cases'],
      },
      {
        title: 'Mini database project',
        tasks: ['Design a small schema for a use case', 'Populate realistic sample data', 'Write a task-based query set', 'Export and document the work'],
      },
    ];
  }

  if (/(network|communication|tcp|ip|dns|routing|security)/.test(topic)) {
    return [
      {
        title: 'Networking basics',
        tasks: ['Define core networking terms', 'Map common protocols to their uses', 'Identify local device network settings', 'Write a one-page concept summary'],
      },
      {
        title: 'Protocol deep dive',
        tasks: ['Study TCP/IP layers', 'Trace a request from client to server', 'Compare HTTP and HTTPS', 'Practice explaining each protocol'],
      },
      {
        title: 'Network tools practice',
        tasks: ['Use command-line networking tools', 'Capture and inspect a sample request', 'Draw a network diagram', 'Review troubleshooting steps'],
      },
      {
        title: 'Applied scenario work',
        tasks: ['Solve a small network case study', 'Document security risks and fixes', 'Present a simple architecture flow', 'Review weak concepts'],
      },
    ];
  }

  if (/(programming|python|java|c\+\+|algorithm|coding|software)/.test(topic)) {
    return [
      {
        title: 'Language basics',
        tasks: ['Set up the development environment', 'Practice variables and control flow', 'Write 3 short exercises', 'Review syntax mistakes'],
      },
      {
        title: 'Functions & structure',
        tasks: ['Write reusable functions', 'Practice lists, arrays, or objects', 'Solve 2 logic problems', 'Document key patterns'],
      },
      {
        title: 'Problem solving',
        tasks: ['Implement a mini console or script project', 'Debug edge cases', 'Refactor for readability', 'Add comments to explain logic'],
      },
      {
        title: 'Build & review',
        tasks: ['Complete a small end-to-end project', 'Test inputs and outputs', 'Fix remaining bugs', 'Prepare a final summary'],
      },
    ];
  }

  return [
    {
      title: 'Setup & orientation',
      tasks: ['Set up the study workspace', 'Outline the main topics', 'Create a study checklist', 'Review the weekly goal'],
    },
    {
      title: 'Core learning',
      tasks: ['Study the main concept for the week', 'Practice with 2 hands-on tasks', 'Write concise notes', 'List open questions'],
    },
    {
      title: 'Applied practice',
      tasks: ['Work on a small practical task', 'Review mistakes and weak spots', 'Repeat one key exercise', 'Update your progress notes'],
    },
    {
      title: 'Consolidation',
      tasks: ['Summarize what you learned', 'Test yourself without notes', 'Improve one unfinished task', 'Plan the next milestone'],
    },
  ];
}

function rotateTemplates(templates, index) {
  return templates[index % templates.length];
}

function buildFallbackRoadmap({ moduleName, moduleCode, goal, dailyStudyTime, durationWeeks }) {
  const totalWeeks = Number(durationWeeks);
  const focus = moduleName.trim();
  const target = goal.trim();
  const code = moduleCode?.trim();
  const templates = getTopicTemplates(focus, target);

  const weeks = Array.from({ length: totalWeeks + 1 }, (_, week) => {
    if (week === 0) {
      return {
        week: 0,
        title: `Week 0 - ${focus} setup`,
        tasks: [
          `Define the main target for ${code ? `${code} ${focus}` : focus}`,
          `Set up notes, folders, and tools for ${focus}`,
          `Create a ${dailyStudyTime} routine for this module`,
          `Break ${target || focus} into weekly checkpoints`,
        ],
      };
    }

    const template = rotateTemplates(templates, week - 1);

    return {
      week,
      title: `Week ${week} - ${focus} ${template.title}`,
      tasks: template.tasks.map(task => task.replace(/the week/gi, `Week ${week}`).replace(/module/gi, focus)),
    };
  });

  return {
    module: focus,
    moduleCode: code || '',
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

export async function generateModuleRoadmap({ moduleName, moduleCode = '', goal, dailyStudyTime, durationWeeks }) {
  try {
    if (CLIENT_API_KEY.trim()) {
      return await generateViaGeminiClient({ moduleName, goal, dailyStudyTime, durationWeeks });
    }

    return await generateViaProxy({ moduleName, goal, dailyStudyTime, durationWeeks });
  } catch (error) {
    if (shouldUseFallback(error)) {
      return buildFallbackRoadmap({ moduleName, moduleCode, goal, dailyStudyTime, durationWeeks });
    }
    throw error;
  }
}
