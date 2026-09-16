import { Settings as SettingsIcon } from 'lucide-react';

export default function AIAssistantSettings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <SettingsIcon className="w-5 h-5 text-muted-foreground" />
        <h2 className="text-xl font-bold">AI Assistant Settings</h2>
      </div>
      <div className="p-6 border border-border rounded-xl bg-card">
        <p className="text-muted-foreground">
          AI Settings have been temporarily disabled in Phase 1 to ensure a fast and stable experience on low-RAM hardware. 
          Please select your preferred model directly from the Assistant chat interface.
        </p>
      </div>
    </div>
  );
}
