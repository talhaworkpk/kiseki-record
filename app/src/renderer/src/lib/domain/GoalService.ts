import { Goal } from '../../types';
import { DomainService } from './DomainService';

export class GoalService implements DomainService<Goal> {
  private collection = 'goals';

  async create(data: Partial<Goal>): Promise<Goal> {
    const newGoal: Goal = {
      ...data,
      title: data.title || 'Untitled Goal',
      description: data.description || '',
      category: data.category || 'Career',
      priority: data.priority || 'medium',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      targetDate: data.targetDate || new Date().toISOString().split('T')[0],
      progress: data.progress || 0,
      status: data.status || 'Active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // @ts-ignore
    const inserted = await window.api.db.insert(this.collection, newGoal);
    return inserted || newGoal;
  }

  async update(id: string, data: Partial<Goal>): Promise<Goal> {
    const updateData = { ...data, updatedAt: Date.now() };
    
    // @ts-ignore
    await window.api.db.update(this.collection, { _id: id }, { $set: updateData }, {});
    
    // fetch and return updated
    return await this.getById(id) as Goal;
  }

  async delete(id: string): Promise<boolean> {
    // @ts-ignore
    const numRemoved = await window.api.db.remove(this.collection, { _id: id }, {});
    return numRemoved > 0;
  }

  async archive(id: string): Promise<Goal> {
    return await this.update(id, { isArchived: true, status: 'Archived' });
  }

  async restore(id: string): Promise<Goal> {
    return await this.update(id, { isArchived: false, status: 'Active' });
  }
  
  async complete(id: string): Promise<Goal> {
    return await this.update(id, { status: 'Completed', progress: 100 });
  }

  async getById(id: string): Promise<Goal | null> {
    // @ts-ignore
    const results = await window.api.db.find(this.collection, { _id: id });
    return results && results.length > 0 ? results[0] : null;
  }

  async find(query: any): Promise<Goal[]> {
    // @ts-ignore
    return await window.api.db.find(this.collection, query);
  }
}

export const goalService = new GoalService();
