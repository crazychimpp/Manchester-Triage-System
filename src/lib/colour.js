// Priority level -> CSS custom property. The only place a level becomes a colour.
export const levelVar = (level) => `var(--p${level})`;

export const LEVEL_SHORT = {
  1: 'Immediate',
  2: 'Very urgent',
  3: 'Urgent',
  4: 'Standard',
  5: 'Non-urgent',
};

export const LEVEL_COLOUR = {
  1: 'Red',
  2: 'Orange',
  3: 'Yellow',
  4: 'Green',
  5: 'Blue',
};
