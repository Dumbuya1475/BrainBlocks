const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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

export async function generateModuleRoadmap({ moduleName, goal, dailyStudyTime, durationWeeks }) {
  const endpoint = `${API_BASE_URL}/api/generate-roadmap`;

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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Roadmap proxy request failed.');
  }

  const data = await response.json();
  return validateRoadmap(data, durationWeeks);
}
