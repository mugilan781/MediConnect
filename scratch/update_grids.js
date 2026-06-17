const fs = require('fs');
const path = require('path');

const cssDir = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css');
const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

let totalChanges = 0;

for (const file of files) {
  const filePath = path.join(cssDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Remove max-width on main grid wrappers (typically around 1000px, 1100px, 1200px)
  // We'll target patterns like max-width: 1000px; or max-width: 1100px; within a grid or section.
  // Actually, let's target specific known bad wrappers or do a generic replace.
  // A generic replace might hit things like max-width: 1200px in a media query! Oh wait, media queries are like @media (max-width: 1200px).
  // Property matches look like "max-width: 1000px;"
  
  content = content.replace(/max-width:\s*1[0-9]{3}px;/g, (match, offset, str) => {
    // Only remove if it is not inside a media query condition (which has a parenthesis)
    // Media query condition is usually "@media (max-width: 1000px)" so there's no semicolon.
    return '/* max-width removed for full-width layout */';
  });

  // 2. Remove margin: 0 auto; when it's used to center a max-width container, 
  // but keep it if it's for smaller things?
  // Let's only replace `margin: 0 auto;` when it's immediately after or before a max-width removal? No, it's safer to just replace `margin: 0 auto;` with `/* margin: 0 auto removed */` for large grid wrappers.
  // Actually, we can leave `margin: 0 auto` for now, because without a max-width, `margin: 0 auto` does nothing to block full-width.

  // 3. Update grid-template-columns: repeat(auto-fit, minmax(xxx, 1fr)); to 280px.
  content = content.replace(/minmax\(\s*[1-2][0-9]{2}px\s*,\s*1fr\s*\)/g, 'minmax(280px, 1fr)');

  // Special fix for homepage.css .home-hero__content max-width: 640px; margin: 0 auto;
  // If we removed max-widths, we might have stretched some specific text containers. The user said:
  // "excluding specific small elements like max-width on a text paragraph or a specific card inside a grid"
  // So replacing 1000+ px is safe.

  // 4. Update layout.css .content media queries
  if (file === 'layout.css') {
    content = content.replace(
      /@media \(max-width: 768px\) {\s*\.content {\s*padding: var\(--space-4\);\s*}\s*}/g,
      `@media (max-width: 1024px) {
  .content {
    padding: 20px 40px;
  }
}
@media (max-width: 768px) {
  .content {
    padding: 16px 20px;
  }
}`
    );
  }

  // Write changes if modified
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
    totalChanges++;
  }
}

console.log(`Total files updated: ${totalChanges}`);
