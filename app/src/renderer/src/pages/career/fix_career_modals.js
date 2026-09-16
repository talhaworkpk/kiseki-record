const fs = require('fs');
const path = require('path');

const dir = '.';
const files = [
  'SkillsTracker.tsx',
  'ResumeBuilder.tsx',
  'ProjectsPortfolio.tsx',
  'Goals.tsx',
  'EducationList.tsx',
  'CertificatesGallery.tsx',
  'CareerList.tsx',
  'Achievements.tsx'
];

files.forEach(filename => {
  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Add import if missing
  if (!content.includes('createPortal')) {
    content = content.replace(/import \{.*?\} from 'react'/, match => match + '\nimport { createPortal } from \'react-dom\'');
    if (content === originalContent) {
      // If no match, just put it at the top
      content = "import { createPortal } from 'react-dom';\n" + content;
    }
  }

  // Find all `<div className="fixed inset-0`
  const regex = /<\s*div[^>]*className="fixed inset-0[^>]*>/g;
  let matches = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push(match);
  }

  // Go backwards from last match to first to avoid messing up indices
  for (let i = matches.length - 1; i >= 0; i--) {
    let m = matches[i];
    
    // Check if it's already in createPortal
    let snippetBefore = content.substring(Math.max(0, m.index - 50), m.index);
    if (snippetBefore.includes('createPortal(')) {
      continue;
    }
    
    // Check if it's the `bg-black z-[9999]` incinerator animation which is usually already a component or doesn't need to be touched if it's already in createPortal
    if (m[0].includes('z-[9999]') && snippetBefore.includes('createPortal')) {
      continue;
    }

    // Replace z-indexes
    let divStr = m[0];
    let newDivStr = divStr.replace(/z-\[?(?:40|50|60|70|100|150|200)\]?/, 'z-[9999]');
    content = content.substring(0, m.index) + newDivStr + content.substring(m.index + divStr.length);
    
    // We need to wrap it.
    // Let's find the nearest `(` before the div
    let openParenIdx = -1;
    for (let j = m.index; j >= 0; j--) {
      if (content[j] === '(') {
        openParenIdx = j;
        break;
      }
      if (content[j] === '}' || content[j] === '{' || content[j] === ';') {
        break; // Stop if we hit block boundaries
      }
    }

    if (openParenIdx !== -1) {
      // Is it a return statement or logical AND ?
      let textBeforeParen = content.substring(Math.max(0, openParenIdx - 20), openParenIdx).trim();
      
      if (textBeforeParen.endsWith('&&') || textBeforeParen.endsWith('?') || textBeforeParen.endsWith('return') || textBeforeParen.endsWith(':')) {
        // We wrap from here
        content = content.substring(0, openParenIdx) + 'createPortal(' + content.substring(openParenIdx + 1);
        
        // Find matching closing parenthesis
        let counter = 1;
        let k = openParenIdx + 'createPortal('.length;
        while (k < content.length && counter > 0) {
          if (content[k] === '(') counter++;
          if (content[k] === ')') counter--;
          k++;
        }
        
        if (counter === 0) {
          // Replaced `)` with `, document.body)`
          content = content.substring(0, k - 1) + ', document.body)' + content.substring(k);
        }
      }
    }
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filename);
  }
});
