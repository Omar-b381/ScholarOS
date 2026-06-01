import { type Card } from 'ts-fsrs'

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
