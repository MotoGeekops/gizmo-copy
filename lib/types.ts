export type CardType =
  | "qa"
  | "cloze"
  | "choice"
  | "multi"
  | "boolean"
  | "matching"
  | "ordering"
  | "image";
export type Card = {
  id: string;
  deckId: string;
  type: CardType;
  front: string;
  answer: string[];
  alternatives: string[];
  options: string[];
  hint: string;
  explanation: string;
  source: string;
  difficulty: "normal" | "hard" | "easy";
  tags: string[];
  ignorePunctuation: boolean;
  mediaId?: string;
  created: number;
  updated: number;
  review?: Review;
  mastery: number;
};
export type Review = {
  state: string;
  interval: number;
  ease: number;
  reviews: number;
  successes: number;
  failures: number;
  lapses: number;
  due: number;
  last_review: number;
  version?: number;
};
export type Subject = { id: string; name: string; color: string };
export type Deck = {
  id: string;
  subjectId: string;
  folderId: string | null;
  title: string;
  description: string;
  color: string;
  favorite: boolean;
  archived: boolean;
  sample: boolean;
  created: number;
  lastStudied: number | null;
  tags: string[];
  count: number;
  due: number;
  mastery: number;
};
export type Session = {
  id: string;
  mode: string;
  cursor: number;
  correct: number;
  started: number;
  ended: number | null;
  timeLimit: number;
  duration: number;
  total: number;
  card: Card | null;
  answers?: any[];
  browse?: Card[];
};
export type Settings = {
  displayName: string;
  theme: "light" | "dark" | "system";
  dailyGoal: number;
  xpGoal: number;
  newLimit: number;
  reviewLimit: number;
  reducedMotion: boolean;
  sound: boolean;
  hideStreak: boolean;
  keyboard: boolean;
  randomize: boolean;
  autoAdvance: boolean;
  aiEnabled: boolean;
  language: "English" | "Filipino";
  onboarded: boolean;
};
export const defaults: Settings = {
  displayName: "",
  theme: "system",
  dailyGoal: 20,
  xpGoal: 200,
  newLimit: 20,
  reviewLimit: 200,
  reducedMotion: false,
  sound: false,
  hideStreak: false,
  keyboard: true,
  randomize: true,
  autoAdvance: false,
  aiEnabled: false,
  language: "English",
  onboarded: false,
};
export const cardTypes: Record<CardType, string> = {
  qa: "Question & answer",
  cloze: "Fill in the blank",
  choice: "Multiple choice",
  multi: "Multiple select",
  boolean: "True or false",
  matching: "Matching",
  ordering: "Ordering",
  image: "Image question",
};
export type AppData = {
  user: { id: string; name: string };
  settings: Settings;
  settingsVersion: number;
  subjects: Subject[];
  folders: { id: string; subjectId: string; name: string }[];
  decks: Deck[];
  cards: Card[];
  exams: any[];
  activity: any[];
  goals: any[];
  sessions: any[];
  unlocks: any[];
  stats: {
    xp: number;
    todayXp: number;
    level: any;
    streak: { current: number; longest: number };
    due: number;
    mastered: number;
    learning: number;
    total: number;
    today: number;
    correct: number;
    answers: number;
    accuracy: number;
    minutes: number;
  };
  ai: { available: boolean; provider: string; model: string };
  engine: string;
};
export const colors = [
  "#7765ed",
  "#34a59a",
  "#e1a23e",
  "#e37f9a",
  "#5b9de0",
  "#ab82cf",
];
export function uid() {
  return crypto.randomUUID();
}
export function manilaDate(ms = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);
}
export function dayIndex(ms = Date.now()) {
  return Math.floor((ms + 8 * 3600000) / 86400000);
}
export function blankCard(deckId = ""): Card {
  return {
    id: uid(),
    deckId,
    type: "qa",
    front: "",
    answer: [],
    alternatives: [],
    options: [],
    hint: "",
    explanation: "",
    source: "",
    difficulty: "normal",
    tags: [],
    ignorePunctuation: true,
    created: Date.now(),
    updated: Date.now(),
    mastery: 0,
  };
}
