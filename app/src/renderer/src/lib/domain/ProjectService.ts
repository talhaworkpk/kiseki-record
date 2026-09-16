import { DomainService } from './DomainService';

// Fallback interface if Project is not exported explicitly in types.ts (using any for now)
export class ProjectService implements DomainService<any> {
  private collection = 'projects';

  async create(data: Partial<any>): Promise<any> {
    const newProject = {
      ...data,
      title: data.title || 'Untitled Project',
      status: data.status || 'Active',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    // @ts-ignore
    const inserted = await window.api.db.insert(this.collection, newProject);
    return inserted || newProject;
  }

  async update(id: string, data: Partial<any>): Promise<any> {
    const updateData = { ...data, updatedAt: Date.now() };
    
    // @ts-ignore
    await window.api.db.update(this.collection, { _id: id }, { $set: updateData }, {});
    return await this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    // @ts-ignore
    const numRemoved = await window.api.db.remove(this.collection, { _id: id }, {});
    return numRemoved > 0;
  }

  async archive(id: string): Promise<any> {
    return await this.update(id, { status: 'Archived' });
  }

  async restore(id: string): Promise<any> {
    return await this.update(id, { status: 'Active' });
  }

  async getById(id: string): Promise<any | null> {
    // @ts-ignore
    const results = await window.api.db.find(this.collection, { _id: id });
    return results && results.length > 0 ? results[0] : null;
  }

  async find(query: any): Promise<any[]> {
    // @ts-ignore
    return await window.api.db.find(this.collection, query);
  }
}

export const projectService = new ProjectService();
