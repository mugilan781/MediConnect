const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css', 'contact.css');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /\.([a-zA-Z0-9_-]+__grid)\s*{\s*display:\s*flex;\s*flex-wrap:\s*wrap;\s*justify-content:\s*center;\s*gap:\s*(var\(--space-[0-9]+\));\s*margin-top:\s*(var\(--space-[0-9]+\));\s*}\s*grid\s*>\s*\*\s*{\s*flex:\s*0\s*1\s*(\d+)px;\s*max-width:\s*\d+px;\s*}/g;

content = content.replace(regex, (match, className, gap, marginTop, flexWidth) => {
  return `.${className} {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${flexWidth}px, 1fr));
  gap: ${gap};
  margin-top: ${marginTop};
}`;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed contact.css');
