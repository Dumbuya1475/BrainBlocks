function parseDateString(value) {
  if (!value) return null;

  const directDate = new Date(value);
  if (!Number.isNaN(directDate.getTime())) return directDate;

  const cleaned = String(value).replace(/^[A-Za-z]{3},\s*/, '').trim();
  const fallbackDate = new Date(cleaned);
  if (!Number.isNaN(fallbackDate.getTime())) return fallbackDate;

  return null;
}

function toDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLogDayKey(log) {
  if (log?.dateKey) return String(log.dateKey);

  const parsed = parseDateString(log?.createdAt || log?.date || log?.dateStr);
  if (!parsed) return null;
  return toDayKey(parsed);
}

export function computeStreak(logs = []) {
  if (!logs.length) return 0;

  const dayKeys = new Set(logs.map(getLogDayKey).filter(Boolean));
  if (!dayKeys.size) return 0;

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  const todayKey = toDayKey(cursor);
  if (!dayKeys.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (dayKeys.has(toDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}