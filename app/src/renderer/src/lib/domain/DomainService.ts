export interface DomainService<T> {
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  archive?(id: string): Promise<T>;
  restore?(id: string): Promise<T>;
  getById(id: string): Promise<T | null>;
  find(query: any): Promise<T[]>;
}
