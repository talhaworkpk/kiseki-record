// Web Demo Mode Mock API
// This intercepts window.api calls when running outside Electron.

import { NotificationEngine } from './NotificationEngine';

// --- Dummy Data Store ---
const generateId = () => Math.random().toString(36).substring(2, 15);

const DUMMY_DB: Record<string, any[]> = {
  userProfile: [
    {
      _id: 'up_demo',
      fullName: 'Alex Explorer',
      email: 'alex@demo.kisekirecord.com',
      phone: '+1 555-0101',
      address: 'Demo City, Web',
      dateOfBirth: '1995-01-01',
      gender: 'Non-binary',
      createdAt: Date.now(),
      lastUpdated: Date.now()
    }
  ],
  relationships: [
    {
      _id: 'self_public',
      name: 'Alex Explorer',
      relationshipType: 'Myself',
      tags: ['Demo', 'Creator'],
      notes: [{ _id: 'n1', content: 'Playing around with the Web Demo.', createdAt: Date.now(), isPinned: false }],
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      _id: generateId(),
      name: 'Sarah Connor',
      relationshipType: 'Best Friend',
      tags: ['Friend', 'Gym'],
      relationshipScore: 92,
      createdAt: Date.now() - 864000000,
      updatedAt: Date.now()
    }
  ],
  habits: [
    {
      _id: 'h1',
      title: 'Morning Workout',
      category: 'Health',
      icon: 'Dumbbell',
      scheduleType: 'daily',
      priority: 'high',
      isTimerEnabled: true,
      targetDuration: 1800,
      startDate: new Date().toISOString(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      _id: 'h2',
      title: 'Read 20 Pages',
      category: 'Education',
      icon: 'Book',
      scheduleType: 'daily',
      priority: 'medium',
      isTimerEnabled: false,
      startDate: new Date().toISOString(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  goals: [
    {
      _id: 'g1',
      title: 'Learn Japanese',
      description: 'Reach conversational fluency for the trip to Tokyo.',
      category: 'Education',
      priority: 'high',
      status: 'Active',
      progress: 35,
      startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
      targetDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      subGoals: [
        { id: 'sg1', title: 'Memorize Hiragana', completed: true, order: 1 },
        { id: 'sg2', title: 'Memorize Katakana', completed: true, order: 2 },
        { id: 'sg3', title: 'Complete Genki 1', completed: false, order: 3 }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  dreams: [
    {
      _id: 'dr1',
      title: 'Travel the World',
      category: 'Lifestyle',
      status: 'Active',
      progress: 10,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  projects: [],
  skills: [],
  records: [
    {
      _id: 'rec1',
      title: 'Exploring Kiseki Record',
      description: 'Testing out this beautiful Web Demo.',
      date: new Date().toISOString(),
      type: 'Note',
      tags: ['Demo', 'Web'],
      privacyLevel: 'public',
      importance: 3,
      isFavorite: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  journal: [],
  chronicle: [],
  chronicleRecords: [],
  notifications: []
};

// --- API Mock ---
export const mockApi = {
  db: {
    find: async (collection: string, query: any) => {
      console.log(`[MockApi] db.find(${collection})`, query);
      return DUMMY_DB[collection] || [];
    },
    insert: async (collection: string, doc: any) => {
      console.log(`[MockApi] db.insert(${collection})`, doc);
      NotificationEngine.notify('info', 'Read-Only Mode', 'Modifications are disabled in the Web Demo.', 'System');
      const newDoc = { ...doc, _id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
      if (!DUMMY_DB[collection]) DUMMY_DB[collection] = [];
      DUMMY_DB[collection].push(newDoc);
      return newDoc;
    },
    update: async (collection: string, query: any, update: any) => {
      console.log(`[MockApi] db.update(${collection})`, query, update);
      NotificationEngine.notify('info', 'Read-Only Mode', 'Updates are disabled in the Web Demo.', 'System');
      return 1;
    },
    remove: async (collection: string, query: any) => {
      console.log(`[MockApi] db.remove(${collection})`, query);
      NotificationEngine.notify('info', 'Read-Only Mode', 'Deletions are disabled in the Web Demo.', 'System');
      return 1;
    }
  },
  profile: {
    getCurrent: async () => 'public',
    hasPrivateProfile: async () => false,
    setupPrivateProfile: async () => false,
    switchToPrivate: async () => false,
    switchToPublic: async () => {},
    updatePassword: async () => false,
    deletePrivateProfile: async () => false,
    getSettings: async () => ({ hasProfile: false })
  },
  appInfo: {
    getPlatform: async () => 'web'
  },
  attachment: {
    add: async () => {
      NotificationEngine.notify('info', 'Read-Only Mode', 'File uploads are disabled in the Web Demo.', 'System');
      return { success: false, cancelled: true };
    },
    saveBase64: async () => ({ success: false, cancelled: true })
  },
  vault: {
    listBackups: async () => ({ success: true, backups: [] })
  },
  ai: {
    sendMessage: async () => 'AI responses are disabled in the web demo.',
    saveContext: async () => {}
  }
};
