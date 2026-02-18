export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
