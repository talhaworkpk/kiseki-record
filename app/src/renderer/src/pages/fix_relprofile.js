const fs = require('fs');

let content = fs.readFileSync('RelationshipProfile.tsx', 'utf8');

const modalTriggers = [
  '{showDeleteModal && !showDeleteSuccess && (',
  '{showDeleteSuccess && (',
  '{showTimelineForm && (',
  '{showMemoryForm && (',
  '{showEventForm && (',
  '{showNoteForm && (',
  '{showProfilePicManager && (',
  '{showChangePicture && (',
  '{viewingPhoto && (',
  '{cropPictureSrc && (',
  '{showEditModal && (',
  '{deleteConfirmAttachmentUrl && createPortal('
];

modalTriggers.forEach(trigger => {
  let idx = content.indexOf(trigger);
  if (idx !== -1) {
    if (trigger.includes('createPortal')) {
      // already uses createPortal, just update z-index later
      return;
    }
    
    let replacedTrigger = trigger.replace('&& (', '&& createPortal(');
    content = content.substring(0, idx) + replacedTrigger + content.substring(idx + trigger.length);
    
    // Now find the matching ')}'
    let counter = 1;
    let i = idx + replacedTrigger.length;
    while (i < content.length && counter > 0) {
      if (content[i] === '(') counter++;
      if (content[i] === ')') counter--;
      i++;
    }
    
    // 'i' is now right after the matching ')'. The next char is likely '}'.
    while (i < content.length && (content[i] === ' ' || content[i] === '\n')) i++;
    
    if (content[i] === '}') {
      // Replace ')}' with '), document.body)}'
      content = content.substring(0, i-1) + '), document.body' + content.substring(i-1);
    }
  }
});

// Also replace z-50, z-[150], z-[200], z-[60], z-[70] with z-[9999]
const zRegex = /className="fixed inset-0[^"]*z-\[?(?:50|60|70|150|200)\]?/g;
content = content.replace(zRegex, match => match.replace(/z-\[?(?:50|60|70|150|200)\]?/, 'z-[9999]'));

fs.writeFileSync('RelationshipProfile.tsx', content);
console.log('Fixed RelationshipProfile.tsx');
