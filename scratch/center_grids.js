const fs = require('fs');
const path = require('path');

const cssDir = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css');
const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

const gridRegex = /(\.[a-zA-Z0-9_-]+)\s*{[^}]*display:\s*grid;\s*grid-template-columns:\s*repeat\(auto-(fill|fit),\s*minmax\((\d+px),\s*1fr\)\);/g;

let totalChanges = 0;

for (const file of files) {
  const filePath = path.join(cssDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // We need to replace the `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));`
  // with `display: flex; flex-wrap: wrap; justify-content: center;`
  
  // And we need to add the child CSS rule.
  
  content = content.replace(gridRegex, (match, className, fillFit, width) => {
    // Determine max-width. If width is 280px, max-width could be 360px.
    const baseWidth = parseInt(width, 10);
    const maxWidth = Math.floor(baseWidth * 1.3); // Allow some stretch
    
    // Replace the grid declaration
    const modifiedMatch = match
      .replace(/display:\s*grid;/, 'display: flex; flex-wrap: wrap; justify-content: center;')
      .replace(/grid-template-columns:\s*repeat\(auto-(fill|fit),\s*minmax\(\d+px,\s*1fr\)\);/, '');
      
    // Return the modified class block + the new child selector block
    return `${modifiedMatch}
${className} > * { flex: 1 1 ${width}; max-width: ${maxWidth}px; }`;
  });

  // Specifically for homepage.css, let's fix `.why-grid` just in case it doesn't match the regex but needs updating,
  // Actually, wait, let's fix `.stats-grid` in layout.css
  if (file === 'layout.css') {
    content = content.replace(/\.grid--stats\s*{\s*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(240px,\s*1fr\)\);\s*}/g,
      `.grid--stats { display: flex; flex-wrap: wrap; justify-content: center; }
.grid--stats > * { flex: 1 1 240px; max-width: 320px; }`);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated grids in ${file}`);
    totalChanges++;
  }
}

console.log(`Total files updated: ${totalChanges}`);
