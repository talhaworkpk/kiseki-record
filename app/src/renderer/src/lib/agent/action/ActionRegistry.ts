import { ActionOperation } from './ActionTypes';

export const ActionRegistry: Record<string, Record<ActionOperation, boolean>> = {
  goal: {
    create: true,
    read: true,
    update: true,
    delete: true,
    archive: true,
    restore: true,
    complete: true,
    uncomplete: false,
    link: true,
    unlink: true
  },
  project: {
    create: true,
    read: true,
    update: true,
    delete: true,
    archive: true,
    restore: true,
    complete: true,
    uncomplete: false,
    link: true,
    unlink: true
  }
};

export const EntityRegistry = [
  'goal',
  'project',
  'habit',
  'record',
  'journal',
  'relationship',
  'skill'
];
