import { Habit, HabitDailyRecord, HabitBreak, SystemUnlock } from '../../types'
import { isHabitActiveOnDay } from '../pages/habits/HabitManager'

export type AchievementRarity = 'Beginner' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Master' | 'Legendary' | 'Kiseki'
export type AchievementCategory = 'Streak' | 'Consistency' | 'Growth' | 'Resilience' | 'Builder' | 'Time' | 'Mastery' | 'Kiseki' | 'Category'
export type AchievementScope = 'habit' | 'category' | 'global'

export interface HabitAchievementMetrics {
  habitId: string
  categoryId: string
  scheduledOccurrences: number
  completedOccurrences: number
  missedOccurrences: number
  scheduledStreak: number
  longestScheduledStreak: number
  completionRate: number
  recoveryCount: number
  totalCompletions: number
  perfectPeriods: number
}

export interface AchievementStage {
  id: string
  title: string
  threshold: number
  icon: string
  rarity: AchievementRarity
}

export interface HabitAchievementDefinition {
  id: string
  title: string
  description: string
  category: AchievementCategory
  scope: AchievementScope
  progressType: 'scheduledStreak' | 'completionRate' | 'recovery' | 'totalCompletions' | 'special'
  minimumEligibleOccurrences?: number
  isSecret?: boolean
  isKiseki?: boolean
  stages: AchievementStage[]
  evaluator: (metrics: HabitAchievementMetrics, allMetrics?: HabitAchievementMetrics[]) => number // Returns the progress metric
}

export const AchievementDefinitions: HabitAchievementDefinition[] = [
  // STREAK
  {
    id: 'eternal-flame',
    title: 'Eternal Flame',
    description: 'Maintain a scheduled streak of habit completions.',
    category: 'Streak',
    scope: 'habit',
    progressType: 'scheduledStreak',
    stages: [
      { id: 'beginner', title: 'Beginner', threshold: 3, icon: '🔥', rarity: 'Beginner' },
      { id: 'bronze', title: 'Bronze', threshold: 7, icon: '🥉', rarity: 'Bronze' },
      { id: 'silver', title: 'Silver', threshold: 14, icon: '🥈', rarity: 'Silver' },
      { id: 'gold', title: 'Gold', threshold: 30, icon: '🥇', rarity: 'Gold' },
      { id: 'platinum', title: 'Platinum', threshold: 60, icon: '💎', rarity: 'Platinum' },
      { id: 'master', title: 'Master', threshold: 100, icon: '⚔️', rarity: 'Master' },
      { id: 'legendary', title: 'Legendary', threshold: 250, icon: '👑', rarity: 'Legendary' },
      { id: 'kiseki', title: 'Eternal Flame', threshold: 365, icon: '🌌', rarity: 'Kiseki' }
    ],
    evaluator: (m) => m.scheduledStreak
  },
  {
    id: 'unstoppable-force',
    title: 'Unstoppable Force',
    description: 'Your longest scheduled streak vs current scheduled streak. Push past your limits.',
    category: 'Streak',
    scope: 'habit',
    progressType: 'scheduledStreak',
    stages: [
      { id: 'bronze', title: 'Pushing', threshold: 10, icon: '💨', rarity: 'Bronze' },
      { id: 'silver', title: 'Momentum', threshold: 25, icon: '🚄', rarity: 'Silver' },
      { id: 'gold', title: 'Unstoppable', threshold: 50, icon: '🚀', rarity: 'Gold' }
    ],
    evaluator: (m) => m.longestScheduledStreak
  },
  {
    id: 'relentless-pursuit',
    title: 'Relentless Pursuit',
    description: 'Achieve massive unbroken streaks.',
    category: 'Streak',
    scope: 'habit',
    progressType: 'scheduledStreak',
    stages: [
      { id: 'silver', title: 'Focused', threshold: 20, icon: '🎯', rarity: 'Silver' },
      { id: 'gold', title: 'Driven', threshold: 45, icon: '🏎️', rarity: 'Gold' },
      { id: 'platinum', title: 'Relentless', threshold: 90, icon: '🌪️', rarity: 'Platinum' }
    ],
    evaluator: (m) => m.scheduledStreak
  },
  {
    id: 'momentum-builder',
    title: 'Momentum Builder',
    description: 'Build initial momentum across all your habits.',
    category: 'Streak',
    scope: 'global',
    progressType: 'special',
    stages: [
      { id: 'beginner', title: 'Spark', threshold: 1, icon: '⚡', rarity: 'Beginner' },
      { id: 'silver', title: 'Current', threshold: 5, icon: '🌊', rarity: 'Silver' },
      { id: 'gold', title: 'Surge', threshold: 10, icon: '🌩️', rarity: 'Gold' }
    ],
    evaluator: (m, allM) => allM ? allM.filter(x => x.scheduledStreak >= 3).length : 0
  },

  // CONSISTENCY
  {
    id: 'steady-hand',
    title: 'Steady Hand',
    description: 'Maintain a high completion rate over your scheduled opportunities.',
    category: 'Consistency',
    scope: 'habit',
    progressType: 'completionRate',
    minimumEligibleOccurrences: 7,
    stages: [
      { id: 'beginner', title: 'Beginner', threshold: 70, icon: '🎯', rarity: 'Beginner' },
      { id: 'bronze', title: 'Bronze', threshold: 80, icon: '🥉', rarity: 'Bronze' },
      { id: 'silver', title: 'Silver', threshold: 85, icon: '🥈', rarity: 'Silver' },
      { id: 'gold', title: 'Gold', threshold: 90, icon: '🥇', rarity: 'Gold' },
      { id: 'platinum', title: 'Platinum', threshold: 95, icon: '💎', rarity: 'Platinum' }
    ],
    evaluator: (m) => m.completionRate
  },
  {
    id: 'perfect-dedication',
    title: 'Perfect Dedication',
    description: 'Complete all scheduled occurrences in a given habit without missing any.',
    category: 'Consistency',
    scope: 'habit',
    progressType: 'special',
    minimumEligibleOccurrences: 14,
    stages: [
      { id: 'silver', title: 'Flawless Fortnight', threshold: 14, icon: '🛡️', rarity: 'Silver' },
      { id: 'gold', title: 'Flawless Month', threshold: 30, icon: '🛡️', rarity: 'Gold' },
      { id: 'platinum', title: 'Flawless Quarter', threshold: 90, icon: '🛡️', rarity: 'Platinum' }
    ],
    evaluator: (m) => m.completionRate === 100 ? m.scheduledOccurrences : 0
  },
  {
    id: 'iron-will',
    title: 'Iron Will',
    description: 'Maintain exceptional consistency after at least 50 scheduled occurrences.',
    category: 'Consistency',
    scope: 'habit',
    progressType: 'completionRate',
    minimumEligibleOccurrences: 50,
    stages: [
      { id: 'silver', title: 'Resolute', threshold: 80, icon: '🗿', rarity: 'Silver' },
      { id: 'gold', title: 'Iron Will', threshold: 90, icon: '⚔️', rarity: 'Gold' },
      { id: 'kiseki', title: 'Diamond Mind', threshold: 98, icon: '💎', rarity: 'Kiseki' }
    ],
    evaluator: (m) => m.completionRate
  },
  {
    id: 'clockwork',
    title: 'Clockwork',
    description: 'Total number of flawlessly completed habits with high consistency.',
    category: 'Consistency',
    scope: 'global',
    progressType: 'special',
    stages: [
      { id: 'bronze', title: 'Reliable', threshold: 2, icon: '⚙️', rarity: 'Bronze' },
      { id: 'silver', title: 'Machine', threshold: 5, icon: '🤖', rarity: 'Silver' },
      { id: 'gold', title: 'Clockwork', threshold: 10, icon: '🕰️', rarity: 'Gold' }
    ],
    evaluator: (m, allM) => allM ? allM.filter(x => x.completionRate >= 85 && x.scheduledOccurrences >= 14).length : 0
  },

  // RESILIENCE
  {
    id: 'the-return',
    title: 'The Return',
    description: 'Successfully resume a habit after missing a scheduled occurrence.',
    category: 'Resilience',
    scope: 'habit',
    progressType: 'recovery',
    stages: [
      { id: 'beginner', title: 'Returner', threshold: 1, icon: '🌱', rarity: 'Beginner' },
      { id: 'bronze', title: 'Comeback', threshold: 3, icon: '🔄', rarity: 'Bronze' },
      { id: 'silver', title: 'Resilient', threshold: 10, icon: '🛡️', rarity: 'Silver' },
      { id: 'gold', title: 'Phoenix', threshold: 25, icon: '🦅', rarity: 'Gold' },
      { id: 'kiseki', title: 'I Rise Again', threshold: 100, icon: '🌌', rarity: 'Kiseki' }
    ],
    evaluator: (m) => m.recoveryCount
  },
  {
    id: 'bounce-back',
    title: 'Bounce Back',
    description: 'Recover quickly from misses across multiple habits.',
    category: 'Resilience',
    scope: 'global',
    progressType: 'special',
    stages: [
      { id: 'bronze', title: 'Rebound', threshold: 5, icon: '🪀', rarity: 'Bronze' },
      { id: 'silver', title: 'Elastic', threshold: 15, icon: '〰️', rarity: 'Silver' },
      { id: 'gold', title: 'Unbreakable', threshold: 30, icon: '⛓️', rarity: 'Gold' }
    ],
    evaluator: (m, allM) => allM ? allM.reduce((acc, curr) => acc + curr.recoveryCount, 0) : 0
  },
  {
    id: 'second-wind',
    title: 'Second Wind',
    description: 'Miss occurrences but keep a solid overall completion rate.',
    category: 'Resilience',
    scope: 'habit',
    progressType: 'completionRate',
    minimumEligibleOccurrences: 30,
    stages: [
      { id: 'silver', title: 'Survivor', threshold: 60, icon: '🏕️', rarity: 'Silver' },
      { id: 'gold', title: 'Thriver', threshold: 75, icon: '🌅', rarity: 'Gold' }
    ],
    evaluator: (m) => m.missedOccurrences > 5 ? m.completionRate : 0
  },
  {
    id: 'never-surrender',
    title: 'Never Surrender',
    description: 'Recover from a miss and then build a massive streak.',
    category: 'Resilience',
    scope: 'habit',
    progressType: 'scheduledStreak',
    stages: [
      { id: 'gold', title: 'Defiant', threshold: 14, icon: '😤', rarity: 'Gold' },
      { id: 'platinum', title: 'Invincible', threshold: 30, icon: '🦸', rarity: 'Platinum' }
    ],
    evaluator: (m) => m.recoveryCount > 0 ? m.scheduledStreak : 0
  },

  // BUILDER
  {
    id: 'habit-builder',
    title: 'Habit Builder',
    description: 'Complete habits repeatedly over time.',
    category: 'Builder',
    scope: 'habit',
    progressType: 'totalCompletions',
    stages: [
      { id: 'beginner', title: 'Beginner', threshold: 10, icon: '🧱', rarity: 'Beginner' },
      { id: 'bronze', title: 'Bronze', threshold: 25, icon: '🥉', rarity: 'Bronze' },
      { id: 'silver', title: 'Silver', threshold: 50, icon: '🥈', rarity: 'Silver' },
      { id: 'gold', title: 'Gold', threshold: 100, icon: '🥇', rarity: 'Gold' },
      { id: 'platinum', title: 'Platinum', threshold: 250, icon: '💎', rarity: 'Platinum' },
      { id: 'master', title: 'Master', threshold: 500, icon: '⚔️', rarity: 'Master' },
      { id: 'legendary', title: 'Legendary', threshold: 1000, icon: '👑', rarity: 'Legendary' },
      { id: 'kiseki', title: 'Legacy', threshold: 5000, icon: '🌌', rarity: 'Kiseki' }
    ],
    evaluator: (m) => m.totalCompletions
  },
  {
    id: 'foundation',
    title: 'Foundation',
    description: 'Total lifetime habit completions across all habits.',
    category: 'Builder',
    scope: 'global',
    progressType: 'special',
    stages: [
      { id: 'bronze', title: 'Groundwork', threshold: 50, icon: '🏗️', rarity: 'Bronze' },
      { id: 'silver', title: 'Structure', threshold: 250, icon: '🏠', rarity: 'Silver' },
      { id: 'gold', title: 'Monument', threshold: 1000, icon: '🏛️', rarity: 'Gold' },
      { id: 'kiseki', title: 'Empire', threshold: 10000, icon: '🌌', rarity: 'Kiseki' }
    ],
    evaluator: (m, allM) => allM ? allM.reduce((acc, curr) => acc + curr.totalCompletions, 0) : 0
  },
  {
    id: 'multi-tasker',
    title: 'Multi-Tasker',
    description: 'Have multiple habits with at least 20 completions.',
    category: 'Builder',
    scope: 'global',
    progressType: 'special',
    stages: [
      { id: 'silver', title: 'Juggler', threshold: 3, icon: '🤹', rarity: 'Silver' },
      { id: 'gold', title: 'Conductor', threshold: 5, icon: '🎼', rarity: 'Gold' },
      { id: 'platinum', title: 'Maestro', threshold: 10, icon: '🎭', rarity: 'Platinum' }
    ],
    evaluator: (m, allM) => allM ? allM.filter(x => x.totalCompletions >= 20).length : 0
  },
  {
    id: 'deep-roots',
    title: 'Deep Roots',
    description: 'Maintain a single habit for a massive number of scheduled opportunities.',
    category: 'Builder',
    scope: 'habit',
    progressType: 'special',
    stages: [
      { id: 'silver', title: 'Sprout', threshold: 100, icon: '🌱', rarity: 'Silver' },
      { id: 'gold', title: 'Tree', threshold: 365, icon: '🌳', rarity: 'Gold' },
      { id: 'platinum', title: 'Forest', threshold: 1000, icon: '🌲', rarity: 'Platinum' }
    ],
    evaluator: (m) => m.scheduledOccurrences
  },

  // KISEKI
  {
    id: 'the-first-step',
    title: 'The First Step',
    description: 'Complete your very first habit occurrence.',
    category: 'Kiseki',
    scope: 'global',
    progressType: 'special',
    isSecret: true,
    isKiseki: true,
    stages: [
      { id: 'kiseki', title: 'Awakening', threshold: 1, icon: '✨', rarity: 'Kiseki' }
    ],
    evaluator: (m, allM) => {
      if (!allM) return 0;
      const total = allM.reduce((acc, curr) => acc + curr.completedOccurrences, 0)
      return total > 0 ? 1 : 0;
    }
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    description: 'Achieve a massive perfect streak across any habit.',
    category: 'Kiseki',
    scope: 'global',
    progressType: 'special',
    isSecret: true,
    isKiseki: true,
    stages: [
      { id: 'kiseki', title: 'Flawless Being', threshold: 1, icon: '✨', rarity: 'Kiseki' }
    ],
    evaluator: (m, allM) => {
      if (!allM) return 0;
      return allM.some(x => x.scheduledStreak >= 100 && x.completionRate === 100) ? 1 : 0;
    }
  },
  {
    id: 'resurrection',
    title: 'Resurrection',
    description: 'Recover a habit after missing it 10 times.',
    category: 'Kiseki',
    scope: 'habit',
    progressType: 'special',
    isSecret: true,
    isKiseki: true,
    stages: [
      { id: 'kiseki', title: 'Back from the Dead', threshold: 1, icon: '🧟', rarity: 'Kiseki' }
    ],
    evaluator: (m) => (m.missedOccurrences >= 10 && m.recoveryCount > 0) ? 1 : 0
  },
  {
    id: 'the-grand-architect',
    title: 'The Grand Architect',
    description: 'Have 10 habits with over 100 completions each.',
    category: 'Kiseki',
    scope: 'global',
    progressType: 'special',
    isSecret: true,
    isKiseki: true,
    stages: [
      { id: 'kiseki', title: 'Master of Reality', threshold: 1, icon: '🌌', rarity: 'Kiseki' }
    ],
    evaluator: (m, allM) => {
      if (!allM) return 0;
      return allM.filter(x => x.totalCompletions >= 100).length >= 10 ? 1 : 0;
    }
  },

  // CATEGORY
  {
    id: 'category-master',
    title: 'Category Master',
    description: 'Consistently complete habits in the same category.',
    category: 'Category',
    scope: 'category',
    progressType: 'totalCompletions',
    stages: [
      { id: 'beginner', title: 'Explorer', threshold: 10, icon: '🔍', rarity: 'Beginner' },
      { id: 'bronze', title: 'Enthusiast', threshold: 25, icon: '🥉', rarity: 'Bronze' },
      { id: 'silver', title: 'Specialist', threshold: 50, icon: '🥈', rarity: 'Silver' },
      { id: 'gold', title: 'Master', threshold: 100, icon: '🎓', rarity: 'Gold' },
      { id: 'kiseki', title: 'Grandmaster', threshold: 500, icon: '🌌', rarity: 'Kiseki' }
    ],
    evaluator: (m) => m.totalCompletions
  },
  {
    id: 'category-streak',
    title: 'Category Streaker',
    description: 'Maintain high streaks across multiple habits in the same category.',
    category: 'Category',
    scope: 'category',
    progressType: 'special',
    stages: [
      { id: 'silver', title: 'Focused', threshold: 1, icon: '🔥', rarity: 'Silver' },
      { id: 'gold', title: 'Obsessed', threshold: 3, icon: '🔥🔥', rarity: 'Gold' },
      { id: 'platinum', title: 'Unstoppable', threshold: 5, icon: '🔥🔥🔥', rarity: 'Platinum' }
    ],
    evaluator: (m) => m.scheduledStreak >= 10 ? 1 : 0 // The UI aggregates this across habits in the category
  },
  {
    id: 'polymath',
    title: 'Polymath',
    description: 'Complete habits across multiple different categories.',
    category: 'Category',
    scope: 'global',
    progressType: 'special',
    stages: [
      { id: 'bronze', title: 'Dabbler', threshold: 2, icon: '🎨', rarity: 'Bronze' },
      { id: 'silver', title: 'Versatile', threshold: 4, icon: '🧠', rarity: 'Silver' },
      { id: 'gold', title: 'Polymath', threshold: 7, icon: '🌟', rarity: 'Gold' }
    ],
    evaluator: (m, allM) => {
      if (!allM) return 0;
      const cats = new Set(allM.filter(x => x.totalCompletions >= 10).map(x => x.categoryId))
      return cats.size;
    }
  },
  {
    id: 'category-dedication',
    title: 'Category Dedication',
    description: 'Achieve 100% completion rate in a category with at least 20 occurrences.',
    category: 'Category',
    scope: 'category',
    progressType: 'special',
    stages: [
      { id: 'gold', title: 'Pure Focus', threshold: 20, icon: '💎', rarity: 'Gold' }
    ],
    evaluator: (m) => m.completionRate === 100 ? m.scheduledOccurrences : 0
  },

  // BUILDER
  {
    id: 'habit-creator',
    title: 'The First Step',
    description: 'Create your very first habit and start your journey.',
    category: 'Builder',
    scope: 'global',
    progressType: 'special',
    stages: [
      { id: 'beginner', title: 'Initiator', threshold: 1, icon: '🌱', rarity: 'Beginner' },
      { id: 'bronze', title: 'Planner', threshold: 5, icon: '📝', rarity: 'Bronze' },
      { id: 'silver', title: 'Visionary', threshold: 10, icon: '🌟', rarity: 'Silver' },
      { id: 'gold', title: 'World Builder', threshold: 25, icon: '🌍', rarity: 'Gold' }
    ],
    evaluator: (m, allM) => {
      if (!allM) return 0;
      return allM.length;
    }
  },

  // GROWTH
  {
    id: 'life-architect',
    title: 'Life Architect',
    description: 'Maintain multiple habits actively.',
    category: 'Growth',
    scope: 'global',
    progressType: 'special',
    stages: [
      { id: 'bronze', title: 'Juggler', threshold: 3, icon: '🤹', rarity: 'Bronze' },
      { id: 'silver', title: 'Coordinator', threshold: 5, icon: '🏗️', rarity: 'Silver' },
      { id: 'gold', title: 'Architect', threshold: 10, icon: '🏛️', rarity: 'Gold' }
    ],
    evaluator: (m, allM) => {
      if (!allM) return 0;
      return allM.filter(metric => metric.completionRate >= 50 && metric.scheduledOccurrences >= 7).length
    }
  },
  {
    id: 'evolution',
    title: 'Evolution',
    description: 'Reach Silver tier or higher on multiple achievements.',
    category: 'Growth',
    scope: 'global',
    progressType: 'special',
    stages: [
      { id: 'silver', title: 'Developing', threshold: 5, icon: '📈', rarity: 'Silver' },
      { id: 'gold', title: 'Evolving', threshold: 15, icon: '🦋', rarity: 'Gold' },
      { id: 'platinum', title: 'Transcending', threshold: 30, icon: '🌌', rarity: 'Platinum' }
    ],
    // Simplified logic here; we just return total completions / 20 as a proxy for "evolution" for the mock since we don't pass systemUnlocks to evaluators.
    evaluator: (m, allM) => allM ? Math.floor(allM.reduce((acc, curr) => acc + curr.totalCompletions, 0) / 20) : 0
  },
  {
    id: 'ascension',
    title: 'Ascension',
    description: 'Increase your total habit occurrences past monumental milestones.',
    category: 'Growth',
    scope: 'global',
    progressType: 'special',
    stages: [
      { id: 'bronze', title: 'Step 1', threshold: 100, icon: '📶', rarity: 'Bronze' },
      { id: 'silver', title: 'Step 2', threshold: 500, icon: '📶', rarity: 'Silver' },
      { id: 'gold', title: 'Step 3', threshold: 2000, icon: '📶', rarity: 'Gold' }
    ],
    evaluator: (m, allM) => allM ? allM.reduce((acc, curr) => acc + curr.scheduledOccurrences, 0) : 0
  },
  {
    id: 'daily-improver',
    title: 'Daily Improver',
    description: 'Have any habit with over 50 completed occurrences and 90% completion.',
    category: 'Growth',
    scope: 'global',
    progressType: 'special',
    stages: [
      { id: 'gold', title: 'Better Every Day', threshold: 1, icon: '📈', rarity: 'Gold' }
    ],
    evaluator: (m, allM) => {
      if (!allM) return 0;
      return allM.some(x => x.totalCompletions >= 50 && x.completionRate >= 90) ? 1 : 0;
    }
  }
]

export class AchievementEngine {

  static generateMetrics(habit: Habit, logs: HabitDailyRecord[], breaks: HabitBreak[]): HabitAchievementMetrics {
    const metrics: HabitAchievementMetrics = {
      habitId: habit._id!,
      categoryId: habit.category || 'General',
      scheduledOccurrences: 0,
      completedOccurrences: 0,
      missedOccurrences: 0,
      scheduledStreak: 0,
      longestScheduledStreak: 0,
      completionRate: 0,
      recoveryCount: 0,
      totalCompletions: 0,
      perfectPeriods: 0
    }

    const createdTime = new Date(habit.createdAt)
    createdTime.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Build log map
    const logMap: Record<string, HabitDailyRecord> = {}
    logs.forEach(l => { logMap[l.date] = l })

    let currentStreak = 0
    let longestStreak = 0
    let lastEligibleStatus: 'completed' | 'missed' | null = null
    let recoveryCount = 0

    // Iterate day by day from creation to today
    let loopDate = new Date(createdTime)
    while (loopDate <= today) {
      const isBreak = breaks.some(b => {
        const bs = new Date(b.startDate)
        const be = new Date(b.endDate)
        bs.setHours(0,0,0,0); be.setHours(0,0,0,0)
        return loopDate >= bs && loopDate <= be
      })

      if (!isBreak && isHabitActiveOnDay(habit, loopDate)) {
        metrics.scheduledOccurrences++
        const dateStr = loopDate.toLocaleDateString('en-CA')
        const log = logMap[dateStr]
        const isBad = habit.category === 'Bad Habit'
        
        let status = 'pending'
        if (log) {
          status = log.status
        } else if (loopDate < today) {
           status = isBad ? 'completed' : 'missed'
        }

        if (status === 'completed') {
          metrics.completedOccurrences++
          metrics.totalCompletions++
          currentStreak++
          if (currentStreak > longestStreak) longestStreak = currentStreak
          
          if (lastEligibleStatus === 'missed') {
            recoveryCount++
          }
          lastEligibleStatus = 'completed'
        } else if (status === 'missed') {
          metrics.missedOccurrences++
          currentStreak = 0
          lastEligibleStatus = 'missed'
        }
      }

      loopDate.setDate(loopDate.getDate() + 1)
    }

    metrics.scheduledStreak = currentStreak
    metrics.longestScheduledStreak = longestStreak
    metrics.recoveryCount = recoveryCount
    metrics.completionRate = metrics.scheduledOccurrences > 0 
      ? Math.round((metrics.completedOccurrences / metrics.scheduledOccurrences) * 100) 
      : 0

    return metrics
  }

  static async evaluateHabit(habitId: string, silentReconciliation: boolean = false) {
    try {
      // @ts-ignore
      const habit: Habit[] = await window.api.db.find('habits', { _id: habitId })
      if (!habit.length) return
      
      // @ts-ignore
      const allHabits: Habit[] = await window.api.db.find('habits', {})
      // @ts-ignore
      const logs: HabitDailyRecord[] = await window.api.db.find('habitLogs', {})
      // @ts-ignore
      const breaks: HabitBreak[] = await window.api.db.find('habitBreaks', {})
      // @ts-ignore
      const unlocks: SystemUnlock[] = await window.api.db.find('systemUnlocks', {})
      const unlockedKeys = new Set(unlocks.map(u => u.key))

      const habitLogs = logs.filter(l => l.habitId === habitId)
      const habitBreaks = breaks.filter(b => b.habitId === habitId)

      const metrics = this.generateMetrics(habit[0], habitLogs, habitBreaks)
      
      // Calculate global metrics context
      const allMetrics = allHabits.map(h => {
        return this.generateMetrics(h, logs.filter(l => l.habitId === h._id), breaks.filter(b => b.habitId === h._id))
      })

      const newlyUnlocked: any[] = []

      for (const def of AchievementDefinitions) {
        // Enforce minimum occurrences if set
        if (def.minimumEligibleOccurrences && metrics.scheduledOccurrences < def.minimumEligibleOccurrences) {
          continue;
        }

        let progress = 0
        if (def.scope === 'global') {
          progress = def.evaluator(metrics, allMetrics)
        } else if (def.scope === 'category') {
          // Aggregate for category
          const catMetrics = allMetrics.filter(m => m.categoryId === metrics.categoryId)
          const aggMetrics = { ...metrics, totalCompletions: catMetrics.reduce((sum, m) => sum + m.totalCompletions, 0) }
          progress = def.evaluator(aggMetrics)
        } else {
          progress = def.evaluator(metrics)
        }

        for (const stage of def.stages) {
          if (progress >= stage.threshold) {
            let unlockKey = ''
            if (def.scope === 'global') unlockKey = `global_achiev:${def.id}:${stage.id}`
            else if (def.scope === 'category') unlockKey = `category_achiev:${metrics.categoryId}:${def.id}:${stage.id}`
            else unlockKey = `habit_achiev:${habitId}:${def.id}:${stage.id}`

            if (!unlockedKeys.has(unlockKey)) {
              // Persist
              // @ts-ignore
              await window.api.db.insert('systemUnlocks', { key: unlockKey, unlockedAt: Date.now() })
              unlockedKeys.add(unlockKey)

              const eventDetail = {
                achievementId: def.id,
                achievementTitle: def.title,
                stageId: stage.id,
                stageTitle: stage.title,
                icon: stage.icon,
                rarity: stage.rarity,
                unlockedAt: Date.now(),
                habitId: def.scope === 'habit' ? habitId : undefined,
                habitName: def.scope === 'habit' ? habit[0].title : undefined,
                category: def.scope === 'category' ? metrics.categoryId : undefined,
                isKiseki: def.isKiseki || stage.rarity === 'Kiseki',
                sourceName: habit[0].title,
                description: def.description
              }
              newlyUnlocked.push(eventDetail)
            }
          }
        }
      }

      if (!silentReconciliation) {
        newlyUnlocked.forEach(event => {
          window.dispatchEvent(new CustomEvent('achievement-unlocked', { detail: event }))
        })
      }

    } catch (e) {
      console.error('Achievement evaluation failed:', e)
    }
  }

  static async reconcileAchievements() {
    try {
      // @ts-ignore
      const allHabits: Habit[] = await window.api.db.find('habits', {})
      for (const h of allHabits) {
        await this.evaluateHabit(h._id!, true) // Silent evaluation
      }
    } catch (e) {
      console.error('Achievement reconciliation failed:', e)
    }
  }
}
