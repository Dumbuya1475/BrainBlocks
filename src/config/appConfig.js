export const ACCESS_MODES = {
  OPEN: 'open',
  UNIVERSITY_ONLY: 'university-only',
  CLASS_ONLY: 'class-only',
};

export const ACCESS_MODE_LABELS = {
  [ACCESS_MODES.OPEN]: 'Open access',
  [ACCESS_MODES.UNIVERSITY_ONLY]: 'University-only (future)',
  [ACCESS_MODES.CLASS_ONLY]: 'Class-only (future)',
};

export const APP_CONFIG = {
  accessMode: ACCESS_MODES.OPEN,
  futureRestriction: {
    university: '',
    classGroup: '',
  },
};
