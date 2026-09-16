import { projectService } from './ProjectService'
import { goalService } from './GoalService'
import { skillService } from './SkillService'
import { ProjectRecord, Goal, SkillRecord, CertificateRecord } from '../../types'

export type GrowthConnectionType =
  | "project-goal"
  | "project-skill"
  | "skill-certificate";

export interface GrowthConnection {
  id: string
  sourceType: 'Dream' | 'Goal' | 'Project' | 'Skill' | 'Certificate'
  sourceId: string
  sourceTitle: string
  targetType: 'Dream' | 'Goal' | 'Project' | 'Skill' | 'Certificate'
  targetId: string
  targetTitle: string
  type?: GrowthConnectionType
}

export interface GrowthInsight {
  id: string
  type: "stalled" | "momentum" | "overload" | "opportunity" | "connection"
  priority: "high" | "medium" | "low"
  confidence: number
  title: string
  description: string
  actionText: string
  actionUrl: string
}

export interface GrowthOverview {
  projects: {
    active: number
    completedThisMonth: number
    stalled: number
  }
  goals: {
    active: number
    averageProgress: number
    needsAttention: number
  }
  skills: {
    tracked: number
    linkedToActiveProjects: number
    linkedToCompletedProjects: number
    linkedToCertificates: number
    improving: number
    inactive: number
  }
  momentum: 'Strong' | 'Stable' | 'Declining' | 'Building'
}

export interface GrowthInsights {
  overview: GrowthOverview
  todaysInsight: GrowthInsight | null
  needsAttention: GrowthInsight[]
  opportunities: GrowthInsight[]
  connections: GrowthConnection[]
  recommendations: GrowthInsight[]
  generatedAt: string
}

export class GrowthIntelligenceService {
  
  // Calculate meaningful last activity timestamp
  private getLastActivity(item: any, type: 'Project' | 'Goal' | 'Skill', allGoals: Goal[] = [], allProjects: ProjectRecord[] = []): number {
    let latest = item.updatedAt || item.createdAt || 0;
    
    // For Goals: subGoals completion adds to meaningful activity
    if (type === 'Goal' && item.subGoals && item.subGoals.length > 0) {
      item.subGoals.forEach((sg: any) => {
        if (sg.completed && sg.completedAt) {
          const compTime = new Date(sg.completedAt).getTime();
          if (compTime > latest) latest = compTime;
        }
      });
    }
    
    // For Projects: activity includes direct activity PLUS meaningful activity from linked Goals
    if (type === 'Project' && allGoals.length > 0) {
      const linkedGoals = allGoals.filter(g => g.projectId === item._id);
      linkedGoals.forEach(g => {
        const goalActivity = this.getLastActivity(g, 'Goal');
        if (goalActivity > latest) {
          latest = goalActivity;
        }
      });
    }
    
    // For Skills: check direct lastUsed PLUS meaningful activity from linked Projects
    if (type === 'Skill') {
      if (item.lastUsed) {
        const usedTime = new Date(item.lastUsed).getTime();
        if (usedTime > latest) latest = usedTime;
      }
      if (allProjects.length > 0 && item.relatedProjects && item.relatedProjects.length > 0) {
        const linkedProjects = allProjects.filter(p => item.relatedProjects.includes(p._id!));
        linkedProjects.forEach(p => {
          const projectActivity = this.getLastActivity(p, 'Project', allGoals);
          if (projectActivity > latest) {
            latest = projectActivity;
          }
        });
      }
    }
    
    return latest;
  }

  async generateInsights(): Promise<GrowthInsights | null> {
    const projects = await projectService.find({ isArchived: { $ne: true } })
    const goals = await goalService.find({ isArchived: { $ne: true } })
    const skills = await skillService.find({ isArchived: { $ne: true } })
    // Use window.api.db for certificates as it may not have a dedicated service exposed yet
    // @ts-ignore
    const certificates = await window.api.db.find('certificates', {}) as CertificateRecord[];
    
    if (projects.length === 0 && goals.length === 0 && skills.length === 0) {
      return null; // Signals first-run / empty state
    }

    const now = Date.now();
    const msInDay = 1000 * 60 * 60 * 24;
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const activeProjects = projects.filter(p => p.status === 'Active' || p.status === 'Planning');
    const completedProjectsMonth = projects.filter(p => p.status === 'Completed' && p.updatedAt > thisMonthStart.getTime());
    
    const activeGoals = goals.filter(g => g.status === 'Active' || g.status === 'Planned');
    const developingSkills = skills.filter(s => (s.level !== undefined && s.level < 100));

    // Measure staleness using propagated meaningful activity
    const stalledProjects = activeProjects.filter(p => (now - this.getLastActivity(p, 'Project', goals)) > (7 * msInDay));
    const stalledGoals = activeGoals.filter(g => (now - this.getLastActivity(g, 'Goal')) > (14 * msInDay));
    
    // A Skill is inactive ONLY if there is no direct activity AND no recent related project activity
    const inactiveSkills = developingSkills.filter(s => (now - this.getLastActivity(s, 'Skill', goals, projects)) > (30 * msInDay));
    const improvingSkills = developingSkills.filter(s => (now - this.getLastActivity(s, 'Skill', goals, projects)) <= (7 * msInDay));

    let totalProgress = 0;
    activeGoals.forEach(g => totalProgress += (g.progress || 0));
    const avgGoalProgress = activeGoals.length > 0 ? Math.round(totalProgress / activeGoals.length) : 0;

    // Momentum heuristic
    let momentum: 'Strong' | 'Stable' | 'Declining' | 'Building' = 'Stable';
    const recentActivityCount = 
      activeProjects.filter(p => (now - this.getLastActivity(p, 'Project', goals)) < (3 * msInDay)).length +
      activeGoals.filter(g => (now - this.getLastActivity(g, 'Goal')) < (3 * msInDay)).length +
      improvingSkills.length;
    
    if (recentActivityCount > 5) momentum = 'Strong';
    else if (recentActivityCount > 0 && stalledProjects.length === 0) momentum = 'Building';
    else if (stalledProjects.length > 2 || stalledGoals.length > 2) momentum = 'Declining';

    // Calculate Skill Links
    let skillsLinkedToActiveProjects = 0;
    let skillsLinkedToCompletedProjects = 0;
    let skillsLinkedToCertificates = 0;

    skills.forEach(s => {
      let hasActive = false;
      let hasCompleted = false;
      
      if (s.relatedProjects && s.relatedProjects.length > 0) {
        s.relatedProjects.forEach(pid => {
          const p = projects.find(proj => proj._id === pid);
          if (p?.status === 'Active') hasActive = true;
          if (p?.status === 'Completed') hasCompleted = true;
        });
      }
      
      // Also check reciprocal relation from projects
      projects.forEach(p => {
        if (p.relatedSkills?.includes(s._id!)) {
          if (p.status === 'Active') hasActive = true;
          if (p.status === 'Completed') hasCompleted = true;
        }
      });
      
      if (hasActive) skillsLinkedToActiveProjects++;
      if (hasCompleted) skillsLinkedToCompletedProjects++;
      if (s.certificates && s.certificates.length > 0) skillsLinkedToCertificates++;
    });

    const overview: GrowthOverview = {
      projects: {
        active: activeProjects.length,
        completedThisMonth: completedProjectsMonth.length,
        stalled: stalledProjects.length
      },
      goals: {
        active: activeGoals.length,
        averageProgress: avgGoalProgress,
        needsAttention: stalledGoals.length
      },
      skills: {
        tracked: skills.length,
        linkedToActiveProjects: skillsLinkedToActiveProjects,
        linkedToCompletedProjects: skillsLinkedToCompletedProjects,
        linkedToCertificates: skillsLinkedToCertificates,
        improving: improvingSkills.length,
        inactive: inactiveSkills.length
      },
      momentum
    };

    const needsAttention: GrowthInsight[] = [];
    const opportunities: GrowthInsight[] = [];
    const recommendations: GrowthInsight[] = [];
    const connections: GrowthConnection[] = [];

    // --- Generate Needs Attention ---
    stalledProjects.forEach(p => {
      needsAttention.push({
        id: `stalled-proj-${p._id}`,
        type: 'stalled',
        priority: 'high',
        confidence: 0.9,
        title: 'Project Stalling',
        description: `"${p.title}" hasn't received progress in over ${Math.floor((now - this.getLastActivity(p, 'Project', goals)) / msInDay)} days.`,
        actionText: 'Open Project',
        actionUrl: `/build-grow/projects?highlight=${p._id}`
      });
    });

    stalledGoals.forEach(g => {
      needsAttention.push({
        id: `stalled-goal-${g._id}`,
        type: 'stalled',
        priority: 'medium',
        confidence: 0.85,
        title: 'Goal Risk',
        description: `"${g.title}" is progressing slower than your previous goals.`,
        actionText: 'Open Goal',
        actionUrl: `/build-grow/goals?highlight=${g._id}`
      });
    });

    // Only flag a skill as neglected if it has no meaningful activity (direct or derived)
    // AND it is connected to an active project (meaning it *should* be active).
    skills.forEach(s => {
      const isInactive = (now - this.getLastActivity(s, 'Skill', goals, projects)) > (30 * msInDay);
      if (isInactive) {
        const linkedActiveProjs = activeProjects.filter(p => s.relatedProjects?.includes(p._id!) || p.relatedSkills?.includes(s._id!));
        if (linkedActiveProjs.length > 0) {
          needsAttention.push({
            id: `inactive-skill-${s._id}`,
            type: 'stalled',
            priority: 'medium',
            confidence: 0.85,
            title: 'Inactive Skill',
            description: `"${s.name}" is linked to active Projects but hasn't had recent activity.`,
            actionText: 'Practice Skill',
            actionUrl: `/build-grow/skills?highlight=${s._id}`
          });
        } else {
          // Disconnected skill opportunity/attention
          needsAttention.push({
            id: `disconnected-skill-${s._id}`,
            type: 'stalled',
            priority: 'low',
            confidence: 0.7,
            title: 'Disconnected Skill',
            description: `"${s.name}" isn't currently connected to any active Project or recent achievement.`,
            actionText: 'Update Skill',
            actionUrl: `/build-grow/skills?highlight=${s._id}`
          });
        }
      }
    });

    // --- Generate Opportunities ---
    
    // Cross-project Skills
    skills.forEach(s => {
      const linkedActiveProjs = activeProjects.filter(p => s.relatedProjects?.includes(p._id!) || p.relatedSkills?.includes(s._id!));
      if (linkedActiveProjs.length >= 2) {
        opportunities.push({
          id: `opp-cross-skill-${s._id}`,
          type: 'momentum',
          priority: 'high',
          confidence: 0.9,
          title: 'Cross-Project Skill',
          description: `Your "${s.name}" skill is highly active, connected to ${linkedActiveProjs.length} active Projects.`,
          actionText: 'Log Skill Activity',
          actionUrl: `/build-grow/skills?highlight=${s._id}`
        });
      }
      
      // Achievement Connection
      if (s.certificates && s.certificates.length > 0 && linkedActiveProjs.length > 0) {
        opportunities.push({
          id: `opp-achieve-skill-${s._id}`,
          type: 'opportunity',
          priority: 'medium',
          confidence: 0.85,
          title: 'Achievement Connection',
          description: `"${s.name}" is connected to active Projects and ${s.certificates.length} Certificate(s).`,
          actionText: 'View Skill',
          actionUrl: `/build-grow/skills?highlight=${s._id}`
        });
      }
    });

    const unlinkedProjects = activeProjects.filter(p => !goals.some(g => g.projectId === p._id));
    if (unlinkedProjects.length > 0 && activeGoals.length > 0) {
      opportunities.push({
        id: `opp-link-proj`,
        type: 'opportunity',
        priority: 'low',
        confidence: 0.7,
        title: 'Goal Opportunity',
        description: `"${unlinkedProjects[0].title}" is active but not linked to a Goal. Consider connecting them.`,
        actionText: 'Connect Project',
        actionUrl: `/build-grow/projects?highlight=${unlinkedProjects[0]._id}`
      });
    }

    // --- Generate Connections ---
    
    // 1. Goal -> Project
    activeGoals.forEach(g => {
      if (g.projectId) {
        const p = projects.find(proj => proj._id === g.projectId);
        if (p) {
          connections.push({
            id: `conn-gp-${g._id}-${p._id}`,
            sourceType: 'Project',
            sourceId: p._id!,
            sourceTitle: p.title,
            targetType: 'Goal',
            targetId: g._id!,
            targetTitle: g.title,
            type: 'project-goal'
          });
        }
      }
    });

    // 2. Project -> Skill
    projects.forEach(p => {
      const linkedSkills = skills.filter(s => p.relatedSkills?.includes(s._id!) || s.relatedProjects?.includes(p._id!));
      linkedSkills.forEach(s => {
        connections.push({
          id: `conn-ps-${p._id}-${s._id}`,
          sourceType: 'Project',
          sourceId: p._id!,
          sourceTitle: p.title,
          targetType: 'Skill',
          targetId: s._id!,
          targetTitle: s.name,
          type: 'project-skill'
        });
      });
    });

    // 3. Skill -> Certificate
    skills.forEach(s => {
      if (s.certificates && s.certificates.length > 0) {
        s.certificates.forEach(cid => {
          const c = certificates.find(cert => cert._id === cid);
          if (c) {
            connections.push({
              id: `conn-sc-${s._id}-${c._id}`,
              sourceType: 'Skill',
              sourceId: s._id!,
              sourceTitle: s.name,
              targetType: 'Certificate',
              targetId: c._id!,
              targetTitle: c.name,
              type: 'skill-certificate'
            });
          }
        });
      }
    });

    // Deduplicate connections (in case bidirectional mapping caused dupes)
    const uniqueConnections = Array.from(new Map(connections.map(c => [c.id, c])).values());

    // --- Generate Recommendations (Recommended Focus) ---
    const allInsights = [...needsAttention, ...opportunities];
    allInsights.sort((a, b) => {
      const pmap = { high: 3, medium: 2, low: 1 };
      return pmap[b.priority] - pmap[a.priority];
    });

    allInsights.slice(0, 3).forEach((insight, idx) => {
      recommendations.push({
        ...insight,
        id: `rec-${idx}-${insight.id}`,
        title: insight.actionText + ` (${insight.title})`
      });
    });

    // --- Today's Insight (Top Priority) ---
    const todaysInsight = allInsights.length > 0 ? allInsights[0] : null;

    return {
      overview,
      todaysInsight,
      needsAttention,
      opportunities,
      connections: uniqueConnections,
      recommendations,
      generatedAt: new Date().toISOString()
    };
  }
}

export const growthIntelligenceService = new GrowthIntelligenceService();
