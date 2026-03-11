export function getTrackableModules(modules = []) {
  return modules.filter(mod => Array.isArray(mod?.roadmap?.weeks) && mod.roadmap.weeks.length > 0);
}

export function getTaskProgressKey(moduleId, weekIndex, taskIndex) {
  return `${moduleId}::${weekIndex}-${taskIndex}`;
}

export function getModuleWeekCompletion(moduleItem, tasks = {}, weekIndex) {
  const week = moduleItem?.roadmap?.weeks?.[weekIndex];
  if (!week?.tasks?.length) return false;
  return week.tasks.every((_, taskIndex) => tasks[getTaskProgressKey(moduleItem.id || moduleItem.name, weekIndex, taskIndex)]);
}

export function getRoadmapStats(modules = [], tasks = {}) {
  const trackable = getTrackableModules(modules);
  let totalTasks = 0;
  let doneTasks = 0;
  let weeksActive = 0;

  trackable.forEach(moduleItem => {
    moduleItem.roadmap.weeks.forEach((week, weekIndex) => {
      let hasDoneTaskInWeek = false;
      week.tasks.forEach((_, taskIndex) => {
        totalTasks += 1;
        const done = Boolean(tasks[getTaskProgressKey(moduleItem.id || moduleItem.name, weekIndex, taskIndex)]);
        if (done) {
          doneTasks += 1;
          hasDoneTaskInWeek = true;
        }
      });
      if (hasDoneTaskInWeek) weeksActive += 1;
    });
  });

  return {
    trackable,
    totalTasks,
    doneTasks,
    weeksActive,
    pct: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
  };
}
