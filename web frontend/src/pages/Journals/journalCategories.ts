// Single source of truth for journal article categories.
// Used by AIWriterPage, UploadArticlePage, EditArticlePage, and JournalsPage
// so the list never drifts out of sync between pages.
export const JOURNAL_CATEGORIES = [
  'Anxiety & Stress Management',
  'Sleep Health',
  'Mindfulness',
  'Depression',
  'Relationships',
  'Self-care',
] as const

export type JournalCategory = typeof JOURNAL_CATEGORIES[number]