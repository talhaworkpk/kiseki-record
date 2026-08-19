import Store from 'electron-store'

export class SettingsManager {
  private store: Store

  constructor() {
    this.store = new Store({
      name: 'global-settings'
    })
  }

  public get(key: string, defaultValue?: any): any {
    return this.store.get(key, defaultValue)
  }

  public set(key: string, value: any): void {
    this.store.set(key, value)
  }

  public delete(key: string): void {
    this.store.delete(key)
  }

  public getAll(): Record<string, any> {
    return this.store.store
  }
}

export const settingsManager = new SettingsManager()
