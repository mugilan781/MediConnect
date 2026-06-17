const fs = require('fs');
const path = require('path');

const cssDir = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css');
const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

let totalChanges = 0;

for (const file of files) {
  const filePath = path.join(cssDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace `flex: 1 1 <width>;` with `flex: 0 1 <width>;` to prevent auto-expansion
  // This ensures a fixed card width strategy as requested by the user.
  content = content.replace(/flex:\s*1\s*1\s*(\d+px)/g, 'flex: 0 1 $1');

  // Let's also do a pass to adjust the base width slightly if it's exactly 280px.
  // 280px is quite small for desktop, if they don't stretch, they will look very narrow.
  // If the user liked them when they stretched to ~320px, maybe we should change 280px to 320px?
  // The user said: "Do NOT modify individual card widths".
  // So I will just strictly change flex-grow from 1 to 0 and leave the base width alone.
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed card widths in ${file}`);
    totalChanges++;
  }
}

console.log(`Total files updated: ${totalChanges}`);
