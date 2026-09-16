const fs = require('fs');

const files = ['Assistant.tsx', 'Assistant_copy.tsx'];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  if (!content.includes('createPortal')) {
    content = content.replace(/import \{.*?\} from 'react'/, match => match + '\nimport { createPortal } from \'react-dom\'');
  }

  const triggers = [
    '{convToDelete !== null && (',
    '{msgToDelete !== null && (',
    '{memoryWarning?.show && (',
    '{showSettingsModal && (',
    '{showMissingModelDialog && (',
    '{importConflictData && ('
  ];

  triggers.forEach(trigger => {
    let idx = content.indexOf(trigger);
    if (idx !== -1) {
      if (trigger.includes('createPortal')) return;
      
      let replacedTrigger = trigger.replace('&& (', '&& createPortal(');
      content = content.substring(0, idx) + replacedTrigger + content.substring(idx + trigger.length);
      
      let counter = 1;
      let i = idx + replacedTrigger.length;
      while (i < content.length && counter > 0) {
        if (content[i] === '(') counter++;
        if (content[i] === ')') counter--;
        i++;
      }
      
      while (i < content.length && (content[i] === ' ' || content[i] === '\n')) i++;
      
      if (content[i] === '}') {
        content = content.substring(0, i-1) + ', document.body' + content.substring(i-1);
      }
    }
  });

  const zRegex = /className="fixed inset-0[^"]*z-\[?(?:50|60|70|100|120|150|200)\]?/g;
  
  // Only replace z-index if it includes flex
  content = content.replace(zRegex, match => {
    if (match.includes('flex') || content.substring(content.indexOf(match), content.indexOf(match) + 200).includes('flex')) {
       return match.replace(/z-\[?(?:50|60|70|100|120|150|200)\]?/, 'z-[9999]');
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});
