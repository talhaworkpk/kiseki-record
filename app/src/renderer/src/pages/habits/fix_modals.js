const fs = require('fs');
const files = [
  'TimelineSettingsModal.tsx',
  'MonthAnalyticsModal.tsx',
  'MissReasonPromptModal.tsx',
  'MissReasonModal.tsx',
  'HabitBreakModal.tsx',
  'HabitAnalyticsModal.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('createPortal')) {
    content = content.replace(/import \{.*\} from 'react'/, match => match + '\nimport { createPortal } from \'react-dom\'');
    content = content.replace(/return \(\n\s*<div className="fixed inset-0 [^"]*"/g, match => {
      return match.replace('return (', 'return createPortal(').replace('z-50', 'z-[9999]').replace('z-[150]', 'z-[9999]');
    });
    content = content.replace(/<\/div>\n\s*\)\n\}\n*$/, '</div>,\n    document.body\n  )\n}\n');
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
