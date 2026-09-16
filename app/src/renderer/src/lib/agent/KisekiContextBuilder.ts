import { Goal, ProjectRecord } from '../../types'

export class KisekiContextBuilder {
  /**
   * Format goals into a compact string limit.
   */
  public static buildGoalsContext(goals: Goal[]): string {
    if (!goals || goals.length === 0) {
      return '[KISEKI CONTEXT]\nThe user has no goals matching this query in their local Kiseki Record database.\n[/KISEKI CONTEXT]\n\n'
    }
    
    let ctx = '[KISEKI CONTEXT]\nThe following information was retrieved from the user\'s local Kiseki Record database.\n\nGoals:\n'
    
    for (const g of goals) {
      const desc = g.description ? (g.description.length > 50 ? g.description.substring(0, 50) + '...' : g.description) : 'No description'
      const deadline = g.targetDate || 'No deadline'
      ctx += `- ${g.title} — ${g.status} — ${g.progress}% — deadline ${deadline} — ${desc}\n`
    }
    
    ctx += '[/KISEKI CONTEXT]\n\n'
    return ctx
  }

  /**
   * Format projects into a compact string limit.
   */
  public static buildProjectsContext(projects: ProjectRecord[]): string {
    if (!projects || projects.length === 0) {
      return '[KISEKI CONTEXT]\nThe user has no projects matching this query in their local Kiseki Record database.\n[/KISEKI CONTEXT]\n\n'
    }
    
    let ctx = '[KISEKI CONTEXT]\nThe following information was retrieved from the user\'s local Kiseki Record database.\n\nProjects:\n'
    
    for (const p of projects) {
      const desc = p.description ? (p.description.length > 50 ? p.description.substring(0, 50) + '...' : p.description) : 'No description'
      ctx += `- ${p.title} — ${p.status} — ${desc}\n`
    }
    
    ctx += '[/KISEKI CONTEXT]\n\n'
    return ctx
  }

  /**
   * Format dashboard data.
   */
  public static buildDashboardContext(result: any): string {
    if (!result || !result.items || result.items.length === 0) {
      return '[KISEKI CONTEXT]\nThe user currently has no records saved in this category in their Kiseki database.\n[/KISEKI CONTEXT]\n\n'
    }
    
    let ctx = `[KISEKI CONTEXT]\n[DASHBOARD RETRIEVAL]\n${result.summary ? result.summary + '\n\n' : ''}`
    
    for (const item of result.items) {
      let line = `- [${item.type.toUpperCase()}] ${item.title}`
      if (item.status) line += ` | Status: ${item.status}`
      if (item.progress !== undefined) line += ` | Progress: ${item.progress}%`
      if (item.date) line += ` | Date: ${item.date}`
      if (item.relevance) line += ` | ${item.relevance}`
      ctx += line + '\n'
    }
    
    ctx += '[/KISEKI CONTEXT]\n\n'
    return ctx
  }

  /**
   * Format reports data.
   */
  public static buildReportsContext(result: any): string {
    if (!result || !result.data || result.data.length === 0) {
      return '[KISEKI CONTEXT]\nThe user currently has no records saved in this category in their Kiseki database.\n[/KISEKI CONTEXT]\n\n'
    }
    
    let ctx = `[KISEKI CONTEXT]\n[REPORTS RETRIEVAL: ${result.title}]\n${result.summary ? result.summary + '\n\n' : ''}`
    
    for (const item of result.data) {
      let line = `- [${item.entityType.toUpperCase()}]`
      if (item.title) line += ` ${item.title}`
      if (item.metric) line += ` | ${item.metric}: ${item.value}`
      if (item.date) line += ` | Date: ${item.date}`
      if (item.relevance) line += ` | ${item.relevance}`
      ctx += line + '\n'
    }
    
    ctx += '[/KISEKI CONTEXT]\n\n'
    return ctx
  }
}
