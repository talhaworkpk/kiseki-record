/**
 * Kiseki Record — Onboarding State Service
 *
 * Manages first-time welcome / introduction completion state for
 * the global welcome and each major section.
 *
 * State is persisted in localStorage under a single versioned key.
 * This keeps it lightweight, survives restarts / updates, and
 * avoids any external backend dependency.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WelcomeSection =
  | 'global'
  | 'habits'
  | 'dreams'
  | 'goals'
  | 'skills'
  | 'projects'
  | 'records'
  | 'journey'
  | 'memory-capsule'
  | 'relationships'
  | 'ai-assistant'

export const ALL_SECTIONS: WelcomeSection[] = [
  'habits',
  'dreams',
  'goals',
  'skills',
  'projects',
  'records',
  'journey',
  'memory-capsule',
  'relationships',
  'ai-assistant',
]

interface OnboardingState {
  /** Schema version – bump when the shape changes */
  version: number
  /** Whether the global first-launch welcome has been completed */
  global: boolean
  /** Per-section completion flags (true = completed / skipped) */
  sections: Partial<Record<WelcomeSection, boolean>>
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'kiseki_onboarding'
const CURRENT_VERSION = 1

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultState(): OnboardingState {
  return {
    version: CURRENT_VERSION,
    global: false,
    sections: {},
  }
}

function readState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()

    const parsed = JSON.parse(raw)

    // Validate shape
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.version !== 'number'
    ) {
      console.warn('[Onboarding] Corrupted state, resetting.')
      return defaultState()
    }

    // Future migration hook: if parsed.version < CURRENT_VERSION → migrate
    return parsed as OnboardingState
  } catch {
    console.warn('[Onboarding] Failed to parse state, resetting.')
    return defaultState()
  }
}

function writeState(state: OnboardingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.error('[Onboarding] Failed to write state:', err)
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const onboardingService = {
  // ---- Queries ------------------------------------------------------------

  /** Has the global welcome been completed or skipped? */
  isGlobalCompleted(): boolean {
    return readState().global
  },

  /** Has a specific section's introduction been completed or skipped? */
  isSectionCompleted(section: WelcomeSection): boolean {
    if (section === 'global') return this.isGlobalCompleted()
    return readState().sections[section] === true
  },

  // ---- Mutations ----------------------------------------------------------

  /** Mark the global welcome as completed. */
  completeGlobal(): void {
    const state = readState()
    state.global = true
    writeState(state)
  },

  /** Mark a section introduction as completed / skipped. */
  completeSection(section: WelcomeSection): void {
    if (section === 'global') {
      this.completeGlobal()
      return
    }
    const state = readState()
    state.sections[section] = true
    writeState(state)
  },

  /** Re-enable a section introduction so it shows again on next visit. */
  resetSection(section: WelcomeSection): void {
    if (section === 'global') {
      const state = readState()
      state.global = false
      writeState(state)
      return
    }
    const state = readState()
    delete state.sections[section]
    writeState(state)
  },

  /** Re-enable ALL introductions (global + every section). */
  resetAll(): void {
    writeState(defaultState())
  },

  // ---- Migration / Existing-user handling ---------------------------------

  /**
   * Called once on app startup.
   *
   * For existing installations that never had onboarding state,
   * this ensures the global welcome is silently marked as completed
   * so existing users are not unexpectedly interrupted.
   *
   * Section introductions are left un-touched — they will appear
   * individually as the user enters each section for the first time,
   * but existing users can also simply skip them.
   *
   * If the onboarding key already exists in localStorage we do nothing
   * (the user has already interacted with the system).
   */
  async initializeForExistingUser(): Promise<void> {
    // If state already exists, nothing to do
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return

    // No state yet — determine whether this is a fresh install or an upgrade.
    // Check for any existing user data in the database.
    try {
      // @ts-ignore – window.api.db is Electron-injected
      const records = await window.api.db.find('records', {})
      // @ts-ignore
      const journal = await window.api.db.find('journal', {})
      // @ts-ignore
      const relationships = await window.api.db.find('relationships', {})
      // @ts-ignore
      const goals = await window.api.db.find('goals', {})

      const hasData =
        (records && records.length > 0) ||
        (journal && journal.length > 0) ||
        (relationships && relationships.length > 0) ||
        (goals && goals.length > 0)

      if (hasData) {
        // Existing user upgrading → suppress global welcome only.
        // Section intros are left individually controllable.
        const state = defaultState()
        state.global = true
        // Also mark sections complete for existing users so they
        // are not interrupted unexpectedly. Users can replay via Settings.
        for (const section of ALL_SECTIONS) {
          state.sections[section] = true
        }
        writeState(state)
        console.log('[Onboarding] Existing user detected – onboarding marked as completed. Replay available in Settings → User Guidance.')
      } else {
        // Brand-new install → create default state (everything un-completed)
        writeState(defaultState())
        console.log('[Onboarding] Fresh install detected – onboarding enabled.')
      }
    } catch (err) {
      // If the DB is unavailable, assume fresh install
      console.warn('[Onboarding] Could not check for existing data:', err)
      writeState(defaultState())
    }
  },

  // ---- Programmatic replay API -------------------------------------------

  /**
   * Show a specific section's welcome next time the user enters it.
   * Convenience alias for resetSection.
   */
  showSectionWelcome(section: WelcomeSection): void {
    this.resetSection(section)
  },
}
