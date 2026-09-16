const fs = require('fs');

let file = 'StorageSettings.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('createPortal')) {
  content = content.replace(/import \{.*?\} from 'react'/, match => match + '\nimport { createPortal } from \'react-dom\'');
}

const triggers = [
  '{showClearCacheModal && (',
  '{isDeleting && ('
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

const zRegex = /className="fixed inset-0[^"]*z-\[?(?:50|60|70|100|150|200)\]?/g;
content = content.replace(zRegex, match => match.replace(/z-\[?(?:50|60|70|100|150|200)\]?/, 'z-[9999]'));

fs.writeFileSync(file, content);
console.log('Fixed', file);
