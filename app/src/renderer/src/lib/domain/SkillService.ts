import { DomainService } from './DomainService';

export interface Skill {
  _id?: string;
  name: string;
  description?: string;
  level?: number;
  category?: string;
  createdAt?: number;
  updatedAt?: number;
}

class SkillServiceImpl implements DomainService<Skill> {
  private collection = 'skills';

  async create(data: Partial<Skill>): Promise<Skill> {
    const doc = {
      ...data,
      level: data.level || 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    return await (window as any).api.db.insert(this.collection, doc);
  }

  async update(id: string, data: Partial<Skill>): Promise<Skill> {
    const changes = {
      ...data,
      updatedAt: Date.now()
    };
    await (window as any).api.db.update(this.collection, { _id: id }, changes);
    const updated = await this.getById(id);
    if (!updated) throw new Error("Failed to retrieve updated skill");
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const numRemoved = await (window as any).api.db.remove(this.collection, { _id: id });
    return numRemoved > 0;
  }

  async getById(id: string): Promise<Skill | null> {
    const docs = await (window as any).api.db.find(this.collection, { _id: id });
    return docs && docs.length > 0 ? docs[0] : null;
  }

  async find(query: any): Promise<Skill[]> {
    return await (window as any).api.db.find(this.collection, query);
  }
}

export const skillService = new SkillServiceImpl();
