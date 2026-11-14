export type MoodType = "terrible" | "sad" | "okay" | "good" | "great";

export const moodMap: Record<MoodType, number> = {
  terrible: 2,
  sad: 4,
  okay: 6,
  good: 8,
  great: 10,
};