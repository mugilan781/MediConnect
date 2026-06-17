const fs = require('fs');
const path = require('path');

const cssDir = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css');
const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

const regex = /([\.a-zA-Z0-9_-]+)\s*{[^}]*grid-template-columns:\s*repeat\(auto-(fill|fit),\s*minmax\((\d+px),\s*1fr\)\);/g;

const matches = [];

for (const file of files) {
  const content = fs.readFileSync(path.join(cssDir, file), 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push({
      file,
      selector: match[1].trim(),
      minWidth: match[3]
    });
  }
}

console.log(JSON.stringify(matches, null, 2));
