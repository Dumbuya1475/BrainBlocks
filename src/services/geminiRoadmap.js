const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || 'llama-3.1-8b-instant';
const CLIENT_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

function buildPrompt({ moduleName, moduleCode, goal, dailyStudyTime, durationWeeks }) {
  return `You are an expert curriculum designer.

Your task is to generate a structured study roadmap for a student.
Be understanding, supportive, and realistic. The student may feel overwhelmed, so break complex work into small manageable steps and keep the guidance encouraging.

The student will provide:
- module name
- module code
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
6. Each week must include exactly 5 tasks.
7. Include at least one assessment-style task per week (quiz, self-test, practice questions, or mini review).
8. Avoid vague reading tasks like "Read chapter 1" unless you also name a specific resource.
9. Prefer specific actions such as "Watch topic intro video, then summarize 5 points" or "Complete Exercise 1-5 from provided lecture sheet".
10. Week 0 must include tool installation and environment setup steps when the module needs software/tools.
11. Each week must also include a short summary, one supportive note, and one checkpoint.
12. The note should explain how to approach the week in plain language.
13. Do NOT include markdown fences or extra commentary.
14. Return ONLY valid JSON.

JSON format required:

{
  "module": "module name",
  "moduleCode": "module code",
  "goal": "learning goal",
  "weeks": [
    {
      "week": 0,
      "title": "Week title",
      "summary": "Short summary of the week",
      "note": "Short helpful instruction or learning note",
      "checkpoint": "What the student should be able to do by the end of the week",
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
Module Code: ${moduleCode || 'N/A'}
Goal: ${goal}
Daily Study Time: ${dailyStudyTime}
Duration Weeks: ${durationWeeks}`;
}

function extractJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI did not return valid JSON.');
  return JSON.parse(match[0]);
}

function normalizeTaskText(task, weekIndex) {
  const base = String(task || '').trim();
  if (!base) return '';

  const vagueReadPattern = /^(read|study)\s+(chapter|unit|topic|section)\b/i;
  if (vagueReadPattern.test(base) || /database concepts|introduction to/i.test(base)) {
    return weekIndex === 0
      ? 'Use your course outline to pick one official starter resource, then summarize 5 key ideas in your notes.'
      : 'Choose one specific course resource for this topic, then summarize 5 key ideas and solve 3 quick checks.';
  }

  return base;
}

function ensureWeekZeroSetupTasks(tasks, moduleName) {
  const hasInstall = tasks.some(task => /(install|setup|configure|environment|ide|tool|dependencies|sdk|compiler)/i.test(task));
  if (hasInstall) return tasks;

  const next = [...tasks];
  next.unshift(`Identify required tools for ${moduleName} (IDE, runtime, database, or simulator) and install them.`);
  next.unshift(`Create and test your ${moduleName} environment setup (open project, run one basic command, verify output).`);
  return next;
}

function ensureAssessmentTask(tasks, weekIndex) {
  const hasAssessment = tasks.some(task => /(quiz|test|assessment|mock|practice questions|self-check|past paper|exam|review without notes)/i.test(task));
  if (hasAssessment) return tasks;
  return [...tasks, `Do a short self-test for Week ${weekIndex} without notes and review mistakes.`];
}

function ensureTaskCount(tasks, weekIndex) {
  const next = [...tasks];
  while (next.length < 5) {
    next.push(`Complete one focused practice activity for Week ${weekIndex} and record what you learned.`);
  }
  return next.slice(0, 5);
}

function normalizeWeek(week, index) {
  const tasks = Array.isArray(week?.tasks)
    ? week.tasks.map(task => normalizeTaskText(task, index)).filter(Boolean)
    : [];

  let normalizedTasks = [...tasks];
  if (index === 0) {
    normalizedTasks = ensureWeekZeroSetupTasks(normalizedTasks, String(week?.title || week?.module || 'this module'));
  }
  normalizedTasks = ensureAssessmentTask(normalizedTasks, index);
  normalizedTasks = ensureTaskCount(normalizedTasks, index);

  return {
    week: typeof week?.week === 'number' ? week.week : index,
    title: String(week?.title || `Week ${index}`).trim(),
    summary: String(week?.summary || `Focus on the main ${index === 0 ? 'setup' : 'study'} goal for this week.`).trim(),
    note: String(week?.note || week?.notes || 'Take the tasks one step at a time and review what feels difficult before moving on.').trim(),
    checkpoint: String(week?.checkpoint || 'Finish the tasks for this week and confirm you can explain the key ideas without notes.').trim(),
    tasks: normalizedTasks,
  };
}

function validateRoadmap(roadmap, requestedWeeks) {
  if (!roadmap || typeof roadmap !== 'object') throw new Error('Invalid roadmap format.');
  if (!Array.isArray(roadmap.weeks)) throw new Error('Roadmap is missing weeks.');
  if (roadmap.weeks.length !== Number(requestedWeeks) + 1) {
    throw new Error('Roadmap weeks count does not match requested duration.');
  }

  const normalizedWeeks = roadmap.weeks.map((week, index) => {
    if (typeof week.week !== 'number' || week.week !== index) {
      throw new Error('Roadmap weeks must start at Week 0 and continue in order.');
    }
    const normalizedWeek = normalizeWeek(week, index);
    if (normalizedWeek.tasks.length === 0) {
      throw new Error(`Week ${index} is missing tasks.`);
    }
    return normalizedWeek;
  });

  return {
    module: String(roadmap.module || '').trim(),
    moduleCode: String(roadmap.moduleCode || '').trim(),
    goal: String(roadmap.goal || '').trim(),
    weeks: normalizedWeeks,
    generatedBy: roadmap.generatedBy || 'groq',
  };
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
        summary: `Set up a clean starting point for ${code ? `${code} ${focus}` : focus}.`,
        note: `Keep this week light and practical. Organize your tools, understand the module expectations, and avoid trying to master everything at once.`,
        checkpoint: `You have a study setup, a weekly routine, and a clear picture of what success in ${focus} looks like.`,
        tasks: [
          `Define the main target for ${code ? `${code} ${focus}` : focus}`,
          `Set up notes, folders, and tools for ${focus}`,
          `Install and configure required tools for ${focus} (IDE, runtime, packages, and any database/simulator).`,
          `Run one quick environment check command and confirm everything works before deep study.`,
          `Create a ${dailyStudyTime} routine for this module`,
          `Run a quick baseline self-test to identify your strongest and weakest areas in ${focus}`,
        ],
      };
    }

    const template = rotateTemplates(templates, week - 1);

    return {
      week,
      title: `Week ${week} - ${focus} ${template.title}`,
      summary: `Build steady progress in ${focus} with a manageable plan for Week ${week}.`,
      note: `Prioritize understanding over speed this week. If one task feels heavy, split it into smaller study sessions and review your notes before continuing.`,
      checkpoint: `By the end of Week ${week}, you should be able to explain the main idea and complete the practice tasks with less help.`,
      tasks: ensureTaskCount(
        ensureAssessmentTask(
          template.tasks.map(task => task.replace(/the week/gi, `Week ${week}`).replace(/module/gi, focus)),
          week
        ),
        week
      ),
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
  const status = Number(error?.status || error?.code || 0);
  const message = String(error?.message || error || '').toLowerCase();
  return (
    status === 429 ||
    status === 401 ||
    status === 403 ||
    message.includes('resource_exhausted') ||
    message.includes('quota') ||
    message.includes('429') ||
    message.includes('too many requests') ||
    message.includes('rate limit') ||
    message.includes('rate_limit_exceeded') ||
    message.includes('unauthorized') ||
    message.includes('invalid api key') ||
    message.includes('invalid_api_key') ||
    message.includes('missing vite_groq_api_key') ||
    message.includes('did not return valid json') ||
    message.includes('invalid roadmap format') ||
    message.includes('roadmap is missing weeks') ||
    message.includes('roadmap weeks count does not match requested duration') ||
    message.includes('failed to fetch') ||
    message.includes('load failed')
  );
}

function createApiError(rawText, fallbackMessage, status = 0) {
  let message = fallbackMessage;

  try {
    const parsed = JSON.parse(rawText);
    message =
      parsed?.error?.message ||
      parsed?.message ||
      parsed?.error ||
      fallbackMessage;
  } catch {
    message = rawText || fallbackMessage;
  }

  const error = new Error(String(message));
  error.status = Number(status || 0);
  return error;
}

async function generateViaGroqClient({ moduleName, moduleCode, goal, dailyStudyTime, durationWeeks }) {
  if (!CLIENT_API_KEY.trim()) {
    const error = new Error('Missing VITE_GROQ_API_KEY. Add it to your .env file.');
    error.status = 401;
    throw error;
  }

  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CLIENT_API_KEY.trim()}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You generate strict JSON study roadmaps only.',
        },
        {
          role: 'user',
          content: buildPrompt({ moduleName, moduleCode, goal, dailyStudyTime, durationWeeks }),
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw createApiError(errorText, 'Groq request failed.', response.status);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';
  return validateRoadmap(extractJson(content), durationWeeks);
}

export async function generateModuleRoadmap({ moduleName, moduleCode = '', goal, dailyStudyTime, durationWeeks }) {
  try {
    return await generateViaGroqClient({ moduleName, moduleCode, goal, dailyStudyTime, durationWeeks });
  } catch (error) {
    if (shouldUseFallback(error)) {
      return buildFallbackRoadmap({ moduleName, moduleCode, goal, dailyStudyTime, durationWeeks });
    }
    throw error;
  }
}
