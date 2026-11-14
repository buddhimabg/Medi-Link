// ── articlesData.ts ──
// Single source of truth for all article data across the Journal module.
// Import ARTICLES and Article type wherever article data is needed.

export interface Article {
  id: string
  emoji: string
  thumbBg: string
  title: string
  category: string
  dateLabel: string
  views?: number
  status: 'Published' | 'Draft'
  readTime: string
  author: string
  authorInitial: string
  publishedDate: string
  summary: string
  content: string
  tags: string[]
  visibility: string
  // Analytics
  patientsReached?: number
  faqClicks?: number
  avgReadTime?: string
}

export const ARTICLES: Article[] = [
  {
    id: '1',
    emoji: '🧠',
    thumbBg: '#e8eaf6',
    title: 'Understanding Cortisol & Stress',
    category: 'Anxiety Management',
    dateLabel: 'Published 15 Nov 2025',
    views: 124,
    status: 'Published',
    readTime: '5 min read',
    author: 'Dr. Dilshari Perera',
    authorInitial: 'D',
    publishedDate: 'Nov 15, 2025',
    summary: 'Evidence-based CBT strategies for managing anxiety disorders, including thought restructuring and mindfulness integration.',
    content: `Cognitive Behavioral Therapy (CBT) is one of the most widely researched and effective forms of psychotherapy for treating anxiety disorders. It focuses on identifying and changing negative thought patterns that contribute to anxiety.

What is CBT?
CBT is based on the concept that thoughts, feelings and behaviors are interconnected. By changing unhelpful thinking patterns, you can change how you feel and act — even in stressful situations.

Key Techniques
1. Cognitive Restructuring — Identifying automatic negative thoughts (ANTs) and replacing them with balanced, realistic alternatives.
2. Graded Exposure — Gradually facing feared situations in a controlled, step-by-step manner to reduce avoidance and build confidence.
3. Mindfulness Integration — Using the 5-4-3-2-1 grounding exercise to anchor yourself in the present moment during anxiety episodes.

Patients are encouraged to practice these strategies daily between sessions for maximum therapeutic benefit.`,
    tags: ['CBT', 'Anxiety', 'Therapy', 'Mental Health'],
    visibility: 'All My Patients',
    patientsReached: 18,
    faqClicks: 42,
    avgReadTime: '3.2 min',
  },
  {
    id: '2',
    emoji: '😴',
    thumbBg: '#e8f5e9',
    title: 'Sleep & Mental Health Connection',
    category: 'Sleep Health',
    dateLabel: 'Published 12 Nov 2025',
    views: 89,
    status: 'Published',
    readTime: '4 min read',
    author: 'Dr. Dilshari Perera',
    authorInitial: 'D',
    publishedDate: 'Nov 12, 2025',
    summary: 'Exploring the bidirectional relationship between sleep quality and mental health outcomes.',
    content: `Sleep is not merely rest — it is a vital biological process that directly impacts mental health. Poor sleep can trigger or worsen anxiety, depression, and mood disorders.

Why Sleep Matters
During sleep, the brain consolidates memories, processes emotions, and clears out toxins. Disrupted sleep prevents these crucial processes from completing, leaving the mind vulnerable.

Common Sleep Disorders in Mental Health
1. Insomnia — Difficulty falling or staying asleep, often linked to anxiety and rumination.
2. Hypersomnia — Excessive sleepiness, frequently associated with depression.
3. Sleep Apnea — Disrupted breathing patterns that fragment sleep and impair cognitive function.

Improving Sleep Hygiene
Consistent sleep schedules, limiting screen time before bed, and relaxation techniques such as progressive muscle relaxation can significantly improve sleep quality and, in turn, mental wellbeing.`,
    tags: ['Sleep', 'Mental Health', 'Insomnia', 'Wellbeing'],
    visibility: 'All My Patients',
    patientsReached: 14,
    faqClicks: 27,
    avgReadTime: '2.8 min',
  },
  {
    id: '3',
    emoji: '🧘',
    thumbBg: '#ede7f6',
    title: 'Mindfulness for Anxiety Relief',
    category: 'Mindfulness',
    dateLabel: 'Published 10 Nov 2025',
    views: 71,
    status: 'Published',
    readTime: '6 min read',
    author: 'Dr. Dilshari Perera',
    authorInitial: 'D',
    publishedDate: 'Nov 10, 2025',
    summary: 'Practical mindfulness exercises to manage anxiety and cultivate a sense of calm in daily life.',
    content: `Mindfulness is the practice of bringing one's attention to the present moment without judgment. It is a powerful, evidence-based tool for managing anxiety and reducing stress.

The Science Behind Mindfulness
Research shows that regular mindfulness practice physically changes the brain — reducing activity in the amygdala (the brain's fear centre) and strengthening the prefrontal cortex, which governs rational thought.

Practical Exercises
1. The 5-4-3-2-1 Grounding Technique — Notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. This anchors you in the present moment.
2. Body Scan Meditation — Slowly move your attention through each part of the body, noticing sensations without judgement.
3. Mindful Breathing — Focus entirely on the breath for 5 minutes, gently redirecting attention when the mind wanders.

These practices, done consistently, can dramatically reduce anxiety symptoms over time.`,
    tags: ['Mindfulness', 'Anxiety', 'Meditation', 'Stress Relief'],
    visibility: 'All My Patients',
    patientsReached: 11,
    faqClicks: 19,
    avgReadTime: '3.9 min',
  },
  {
    id: '4',
    emoji: '💼',
    thumbBg: '#fff8e1',
    title: 'Managing Work-Related Stress',
    category: 'Work & Stress',
    dateLabel: 'Last edited today',
    status: 'Draft',
    readTime: '6 min read',
    author: 'Dr. Dilshari Perera',
    authorInitial: 'D',
    publishedDate: 'Draft',
    summary: 'Evidence-based strategies to identify, manage, and recover from occupational stress and burnout.',
    content: `Work-related stress has become one of the most prevalent mental health challenges in modern society. This article explores evidence-based strategies to manage occupational stress effectively.

Understanding Work Stress
Occupational stress arises when the demands of a job exceed a person's capacity to cope. Recognising the signs early is crucial to preventing burnout.

Coping Strategies
1. Time Management — Prioritising tasks and setting realistic deadlines reduces overwhelm and improves productivity.
2. Boundary Setting — Learning to say no and establishing clear work-life boundaries is essential for long-term wellbeing.

[Draft note: Add section on relaxation techniques and case study before publishing.]`,
    tags: ['Work Stress', 'Burnout', 'Wellbeing', 'CBT'],
    visibility: 'All My Patients',
  },
]

export const getArticleById = (id: string): Article | undefined =>
  ARTICLES.find(a => a.id === id)