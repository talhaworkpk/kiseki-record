export interface GraphNode {
  id: string
  label: string
  category: string
  createdAt: number
  updatedAt: number
  color: string
  val: number
  details?: string
  originalData?: any
}

export interface GraphLink {
  source: string
  target: string
  label?: string
}

export const CATEGORY_COLORS = {
  Goal: '#ec4899', // pink
  Journal: '#8b5cf6', // purple
  Record: '#3b82f6', // blue
  Habit: '#10b981', // emerald
  Relationship: '#f43f5e', // rose
  Career: '#f59e0b', // amber
  Education: '#06b6d4', // cyan
  Project: '#6366f1', // indigo
  Certificate: '#eab308', // yellow
  Achievement: '#f97316', // orange
  Skill: '#84cc16', // lime
}

export function buildKnowledgeGraph(data: any) {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const nodeMap = new Set<string>()

  const addNode = (node: GraphNode) => {
    if (!nodeMap.has(node.id)) {
      nodes.push(node)
      nodeMap.add(node.id)
    }
  }

  const addLink = (source: string, target: string, label?: string) => {
    if (!source || !target) return
    // Wait until end to verify both nodes exist to avoid dangling edges
    links.push({ source, target, label })
  }

  // 1. Goals
  if (data.goals) {
    data.goals.forEach((g: any) => {
      if (!g._id) return
      addNode({
        id: g._id,
        label: g.title,
        category: 'Goal',
        createdAt: g.createdAt || new Date(g.startDate).getTime() || 0,
        updatedAt: g.updatedAt || Date.now(),
        color: CATEGORY_COLORS.Goal,
        val: 1.5,
        details: g.description,
        originalData: g
      })
    })
  }

  // 2. Habits
  if (data.habits) {
    data.habits.forEach((h: any) => {
      if (!h._id) return
      addNode({
        id: h._id,
        label: h.title,
        category: 'Habit',
        createdAt: h.createdAt || new Date(h.startDate).getTime() || 0,
        updatedAt: h.updatedAt || Date.now(),
        color: CATEGORY_COLORS.Habit,
        val: 1.2,
        details: h.description,
        originalData: h
      })
    })
  }

  // 3. Records
  if (data.records) {
    data.records.forEach((r: any) => {
      if (!r._id) return
      addNode({
        id: r._id,
        label: r.title,
        category: 'Record',
        createdAt: r.createdAt || new Date(r.date).getTime() || 0,
        updatedAt: r.updatedAt || Date.now(),
        color: CATEGORY_COLORS.Record,
        val: 1,
        details: r.description,
        originalData: r
      })
      // Connections
      if (r.relatedGoals) r.relatedGoals.forEach((gid: string) => addLink(r._id, gid, 'Related Goal'))
      if (r.relatedHabits) r.relatedHabits.forEach((hid: string) => addLink(r._id, hid, 'Related Habit'))
      if (r.relatedRecords) r.relatedRecords.forEach((rid: string) => addLink(r._id, rid, 'Related Record'))
      if (r.people) r.people.forEach((pid: string) => addLink(r._id, pid, 'Involved Person'))
    })
  }

  // 4. Journal
  if (data.journal) {
    data.journal.forEach((j: any) => {
      if (!j._id) return
      addNode({
        id: j._id,
        label: j.title || 'Journal Entry',
        category: 'Journal',
        createdAt: j.createdAt || new Date(j.date).getTime() || 0,
        updatedAt: j.updatedAt || Date.now(),
        color: CATEGORY_COLORS.Journal,
        val: 1,
        details: 'Journal Entry',
        originalData: j
      })
    })
  }

  // 5. Relationships
  if (data.relationships) {
    data.relationships.forEach((p: any) => {
      if (!p._id) return
      addNode({
        id: p._id,
        label: p.name,
        category: 'Relationship',
        createdAt: p.createdAt || 0,
        updatedAt: p.updatedAt || Date.now(),
        color: CATEGORY_COLORS.Relationship,
        val: 1.2,
        details: p.relationshipType,
        originalData: p
      })
    })
  }

  // 6. Skills
  if (data.skills) {
    data.skills.forEach((s: any) => {
      if (!s._id) return
      addNode({
        id: s._id,
        label: s.name,
        category: 'Skill',
        createdAt: s.createdAt || 0,
        updatedAt: s.updatedAt || Date.now(),
        color: CATEGORY_COLORS.Skill,
        val: 1,
        details: `Level: ${s.level}%`,
        originalData: s
      })
      if (s.relatedProjects) s.relatedProjects.forEach((pid: string) => addLink(s._id, pid, 'Used In'))
      if (s.certificates) s.certificates.forEach((cid: string) => addLink(s._id, cid, 'Certified By'))
    })
  }

  // 7. Projects
  if (data.projects) {
    data.projects.forEach((p: any) => {
      if (!p._id) return
      addNode({
        id: p._id,
        label: p.title,
        category: 'Project',
        createdAt: p.createdAt || 0,
        updatedAt: p.updatedAt || Date.now(),
        color: CATEGORY_COLORS.Project,
        val: 1.5,
        details: p.description,
        originalData: p
      })
      if (p.relatedSkills) p.relatedSkills.forEach((sid: string) => addLink(p._id, sid, 'Requires Skill'))
    })
  }

  // 8. Certificates
  if (data.certificates) {
    data.certificates.forEach((c: any) => {
      if (!c._id) return
      addNode({
        id: c._id,
        label: c.name,
        category: 'Certificate',
        createdAt: c.createdAt || 0,
        updatedAt: c.updatedAt || Date.now(),
        color: CATEGORY_COLORS.Certificate,
        val: 1,
        details: c.organization,
        originalData: c
      })
      if (c.relatedSkills) c.relatedSkills.forEach((sid: string) => addLink(c._id, sid, 'Validates Skill'))
    })
  }

  // 9. Career
  if (data.career) {
    data.career.forEach((c: any) => {
      if (!c._id) return
      addNode({
        id: c._id,
        label: `${c.position} at ${c.company}`,
        category: 'Career',
        createdAt: c.createdAt || 0,
        updatedAt: c.updatedAt || Date.now(),
        color: CATEGORY_COLORS.Career,
        val: 1.5,
        originalData: c
      })
      if (c.skillsUsed) c.skillsUsed.forEach((sid: string) => addLink(c._id, sid, 'Skill Used'))
      if (c.projects) c.projects.forEach((pid: string) => addLink(c._id, pid, 'Project'))
      if (c.achievements) c.achievements.forEach((aid: string) => addLink(c._id, aid, 'Achievement'))
    })
  }

  // 10. Education
  if (data.education) {
    data.education.forEach((e: any) => {
      if (!e._id) return
      addNode({
        id: e._id,
        label: `${e.degree} at ${e.school}`,
        category: 'Education',
        createdAt: e.createdAt || 0,
        updatedAt: e.updatedAt || Date.now(),
        color: CATEGORY_COLORS.Education,
        val: 1.5,
        originalData: e
      })
      if (e.achievements) e.achievements.forEach((aid: string) => addLink(e._id, aid, 'Achievement'))
    })
  }

  // 11. Achievements
  if (data.achievements) {
    data.achievements.forEach((a: any) => {
      if (!a._id) return
      addNode({
        id: a._id,
        label: a.title,
        category: 'Achievement',
        createdAt: a.createdAt || 0,
        updatedAt: a.updatedAt || Date.now(),
        color: CATEGORY_COLORS.Achievement,
        val: 1.2,
        details: a.description,
        originalData: a
      })
      if (a.relatedEducation) addLink(a._id, a.relatedEducation, 'From Education')
      if (a.relatedCareer) addLink(a._id, a.relatedCareer, 'From Career')
    })
  }

  // Filter valid links
  const validLinks = links.filter(link => nodeMap.has(link.source) && nodeMap.has(link.target))

  // Add implicit links (e.g., Records and Journals on same day)
  const dateMap = new Map<string, string[]>()
  nodes.forEach(n => {
    if (n.category === 'Record' || n.category === 'Journal' || n.category === 'Habit') {
      let dStr = ''
      const dateValue = n.originalData.date
      if (dateValue) {
        // Convert date to string if it's a Date object, otherwise use as-is
        const dateStr = typeof dateValue === 'string' ? dateValue : new Date(dateValue).toISOString()
        dStr = dateStr.substring(0, 10)
      }
      if (dStr) {
        if (!dateMap.has(dStr)) dateMap.set(dStr, [])
        dateMap.get(dStr)!.push(n.id)
      }
    }
  })

  // Create links for same-day items, max 10 per day to avoid explosion
  dateMap.forEach(ids => {
    if (ids.length > 1 && ids.length < 15) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          validLinks.push({ source: ids[i], target: ids[j], label: 'Same Day' })
        }
      }
    }
  })

  return { nodes, links: validLinks }
}
