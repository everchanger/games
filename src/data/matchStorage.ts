import type { MatchState } from '../game'

const STORAGE_KEY = 'games-poc-match-v1'

export const loadMatch = (): MatchState | null => {
  if (typeof localStorage === 'undefined') {
    return null
  }

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as MatchState
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export const saveMatch = (match: MatchState): void => {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(match))
}

export const clearMatch = (): void => {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.removeItem(STORAGE_KEY)
}
