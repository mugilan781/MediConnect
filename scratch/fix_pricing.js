const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css', 'pricing.css');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /\.([a-zA-Z0-9_-]+__grid)\s*{\s*display:\s*flex;\s*flex-wrap:\s*wrap;\s*justify-content:\s*center;\s*gap:\s*(var\(--space-[0-9]+\));\s*margin-top:\s*(var\(--space-[0-9]+\));\s*}\s*grid\s*>\s*\*\s*{\s*flex:\s*0\s*1\s*(\d+)px;\s*max-width:\s*\d+px;\s*}/g;

content = content.replace(regex, (match, className, gap, marginTop, flexWidth) => {
  // We use 320px for pricing-plans, otherwise 280px or whatever flexWidth was
  let minWidth = flexWidth + 'px';
  if (className === 'pricing-plans__grid') {
    minWidth = '320px';
  }

  return `.${className} {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${minWidth}, 1fr));
  gap: ${gap};
  margin-top: ${marginTop};
}`;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed pricing.css');
