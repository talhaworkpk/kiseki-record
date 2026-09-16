import { DomainService } from './DomainService';
import { Dream, DreamGoal, DreamProject, DreamSkill, DreamCertificate } from '../../types';
import { DREAM_CATEGORIES } from '../constants/dreams';

export class DreamService implements DomainService<Dream> {
  private collection = 'dreams';

  async create(data: Partial<Dream>): Promise<Dream> {
    // Amount validation
    if (data.targetAmount !== undefined && data.targetAmount < 0) throw new Error('Target amount cannot be negative');
    if (data.currentAmount !== undefined && data.currentAmount < 0) throw new Error('Current amount cannot be negative');

    const newDream = {
      ...data,
      title: data.title || 'Untitled Dream',
      category: data.category || 'other',
      status: data.status || 'Active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // @ts-ignore
    const inserted = await window.api.db.insert(this.collection, newDream);
    return inserted || newDream;
  }

  async update(id: string, data: Partial<Dream>): Promise<Dream> {
    // Amount validation
    if (data.targetAmount !== undefined && data.targetAmount < 0) throw new Error('Target amount cannot be negative');
    if (data.currentAmount !== undefined && data.currentAmount < 0) throw new Error('Current amount cannot be negative');

    const updateData = { ...data, updatedAt: Date.now() };
    
    // @ts-ignore
    await window.api.db.update(this.collection, { _id: id }, { $set: updateData }, {});
    return await this.getById(id) as Dream;
  }

  async delete(id: string): Promise<boolean> {
    // Delete associated relationships first
    // @ts-ignore
    await window.api.db.remove('dream_goals', { dreamId: id }, { multi: true });
    // @ts-ignore
    await window.api.db.remove('dream_projects', { dreamId: id }, { multi: true });
    // @ts-ignore
    await window.api.db.remove('dream_skills', { dreamId: id }, { multi: true });
    // @ts-ignore
    await window.api.db.remove('dream_certificates', { dreamId: id }, { multi: true });

    // @ts-ignore
    const numRemoved = await window.api.db.remove(this.collection, { _id: id }, {});
    return numRemoved > 0;
  }

  async archive(id: string): Promise<Dream> {
    return await this.update(id, { status: 'Archived', archivedAt: Date.now() });
  }

  async restore(id: string): Promise<Dream> {
    return await this.update(id, { status: 'Active', archivedAt: undefined });
  }

  async getById(id: string): Promise<Dream | null> {
    // @ts-ignore
    const results = await window.api.db.find(this.collection, { _id: id });
    return results && results.length > 0 ? results[0] : null;
  }

  async find(query: any): Promise<Dream[]> {
    // @ts-ignore
    return await window.api.db.find(this.collection, query);
  }

  // Relationships

  async linkDreamToGoal(dreamId: string, goalId: string): Promise<void> {
    // @ts-ignore
    const existing = await window.api.db.find('dream_goals', { dreamId, goalId });
    if (existing.length === 0) {
      // @ts-ignore
      await window.api.db.insert('dream_goals', { dreamId, goalId });
    }
  }

  async unlinkDreamFromGoal(dreamId: string, goalId: string): Promise<void> {
    // @ts-ignore
    await window.api.db.remove('dream_goals', { dreamId, goalId }, { multi: true });
  }

  async getDreamGoals(dreamId: string): Promise<DreamGoal[]> {
    // @ts-ignore
    return await window.api.db.find('dream_goals', { dreamId });
  }

  async getGoalDreams(goalId: string): Promise<DreamGoal[]> {
    // @ts-ignore
    return await window.api.db.find('dream_goals', { goalId });
  }

  async linkDreamToProject(dreamId: string, projectId: string): Promise<void> {
    // @ts-ignore
    const existing = await window.api.db.find('dream_projects', { dreamId, projectId });
    if (existing.length === 0) {
      // @ts-ignore
      await window.api.db.insert('dream_projects', { dreamId, projectId });
    }
  }

  async unlinkDreamFromProject(dreamId: string, projectId: string): Promise<void> {
    // @ts-ignore
    await window.api.db.remove('dream_projects', { dreamId, projectId }, { multi: true });
  }

  async getDreamProjects(dreamId: string): Promise<DreamProject[]> {
    // @ts-ignore
    return await window.api.db.find('dream_projects', { dreamId });
  }

  async linkDreamToSkill(dreamId: string, skillId: string): Promise<void> {
    // @ts-ignore
    const existing = await window.api.db.find('dream_skills', { dreamId, skillId });
    if (existing.length === 0) {
      // @ts-ignore
      await window.api.db.insert('dream_skills', { dreamId, skillId });
    }
  }

  async unlinkDreamFromSkill(dreamId: string, skillId: string): Promise<void> {
    // @ts-ignore
    await window.api.db.remove('dream_skills', { dreamId, skillId }, { multi: true });
  }

  async getDreamSkills(dreamId: string): Promise<DreamSkill[]> {
    // @ts-ignore
    return await window.api.db.find('dream_skills', { dreamId });
  }

  async linkDreamToCertificate(dreamId: string, certificateId: string): Promise<void> {
    // @ts-ignore
    const existing = await window.api.db.find('dream_certificates', { dreamId, certificateId });
    if (existing.length === 0) {
      // @ts-ignore
      await window.api.db.insert('dream_certificates', { dreamId, certificateId });
    }
  }

  async unlinkDreamFromCertificate(dreamId: string, certificateId: string): Promise<void> {
    // @ts-ignore
    await window.api.db.remove('dream_certificates', { dreamId, certificateId }, { multi: true });
  }

  async getDreamCertificates(dreamId: string): Promise<DreamCertificate[]> {
    // @ts-ignore
    return await window.api.db.find('dream_certificates', { dreamId });
  }
}

export const dreamService = new DreamService();
