import { FSRS, generatorParameters, createEmptyCard, Rating, type Card, type FSRSParameters } from 'ts-fsrs'

// Default FSRS parameters — tunable in Settings later
const params: FSRSParameters = generatorParameters({ enable_fuzz: true })
export const fsrs = new FSRS(params)

// Arabic rating labels
export const ARABIC_RATINGS: Record<Rating, string> = {
  [Rating.Again]: 'مجدداً 😟',   // 1
  [Rating.Hard]:  'صعب 😐',       // 2
  [Rating.Good]:  'جيد 🙂',       // 3
  [Rating.Easy]:  'سهل 😄',       // 4
  [Rating.Manual]: 'يدوي 📝',
}

// Color per rating for UI buttons
export const RATING_COLORS: Record<Rating, string> = {
  [Rating.Again]: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900',
  [Rating.Hard]:  'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900',
  [Rating.Good]:  'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900',
  [Rating.Easy]:  'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900',
  [Rating.Manual]: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
}

// Convert a DB flashcard row → ts-fsrs Card object
export function dbRowToCard(row: any): Card {
  return {
    due:           new Date(row.due || Date.now()),
    stability:     row.stability ?? 0,
    difficulty:    row.difficulty ?? 0,
    elapsed_days:  row.elapsed_days ?? 0,
    scheduled_days:row.scheduled_days ?? 0,
    reps:          row.reps ?? 0,
    lapses:        row.lapses ?? 0,
    state:         row.state ?? 0,
    last_review:   row.last_review ? new Date(row.last_review) : undefined,
  }
}

// Convert ts-fsrs Card → DB fields for UPDATE
export function cardToDbFields(card: Card) {
  return {
    due:            card.due.toISOString(),
    stability:      card.stability,
    difficulty:     card.difficulty,
    elapsed_days:   card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps:           card.reps,
    lapses:         card.lapses,
    state:          card.state,
    last_review:    card.last_review?.toISOString() ?? null,
  }
}

// Schedule a card given a rating — returns updated card + next review info
export function scheduleCard(card: Card, rating: Rating) {
  const now = new Date()
  const result = fsrs.next(card, now, rating as any) as any
  const scheduled = result[rating]
  return {
    updatedCard: scheduled.card,
    reviewLog:   scheduled.log,
    nextReviewIn: scheduled.card.scheduled_days,
  }
}

// Get cards due for review right now
export function isDue(card: Card): boolean {
  return new Date(card.due) <= new Date()
}

// Create a brand-new empty card (for newly generated flashcards)
export { createEmptyCard, Rating }
