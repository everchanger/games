import type { MatchState } from '../game'

export interface MatchRepository {
  clear(): void
  load(): MatchState | null
  save(match: MatchState): void
}

const STORAGE_KEY = 'games-poc-match-v1'

export const localStorageMatchRepository: MatchRepository = {
  load() {
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
  },

  save(match) {
    if (typeof localStorage === 'undefined') {
      return
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(match))
  },

  clear() {
    if (typeof localStorage === 'undefined') {
      return
    }

    localStorage.removeItem(STORAGE_KEY)
  },
}
