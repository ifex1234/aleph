/** Cross-service runtime state (the AppState equivalent). */
const state = { activeTranslationId: 1 }

export function sharedState(): typeof state {
  return state
}
