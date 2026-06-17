const fs = require('fs');
const path = require('path');

const cssPath = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css', 'dashboard.css');
let content = fs.readFileSync(cssPath, 'utf8');

// 1. App Wrapper constraints
content = content.replace(/\.app {\s*display: flex;/, '.app {\n  display: flex;\n  box-sizing: border-box;\n  overflow-x: hidden;');

// 2. Main content wrapper width & flex fixes
content = content.replace(/\.main {([\s\S]*?)}/, '.main {$1  min-width: 0;\n  width: auto;\n  max-width: 100%;\n}');
content = content.replace(/\.content {([\s\S]*?)width: 100%;([\s\S]*?)}/, '.content {$1min-width: 0;\n  width: auto;\n  max-width: 100%;\n  box-sizing: border-box;$2}');

// 3. Welcome Banner constraints
content = content.replace(/\.welcome-banner {([\s\S]*?)}/, '.welcome-banner {$1  max-width: 100%;\n  box-sizing: border-box;\n}');

// 4. Tab Bar Wrapping
content = content.replace(/\.tab-bar {([\s\S]*?)overflow-x: auto;([\s\S]*?)}/, '.tab-bar {$1flex-wrap: wrap;$2}');

// 5. Grid Conversions
// Stats row
content = content.replace(/\.stats-row {([\s\S]*?)display: flex;\s*flex-wrap: wrap;\s*justify-content: center;([\s\S]*?)}/, '.stats-row {$1display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));$2}');
content = content.replace(/\.stats-row > \* {[\s\S]*?}/, ''); // Remove explicit child width rule

// Quick actions
content = content.replace(/\.quick-actions {([\s\S]*?)display: flex;\s*flex-wrap: wrap;\s*justify-content: center;([\s\S]*?)}/, '.quick-actions {$1display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));$2}');
content = content.replace(/\.quick-actions > \* {[\s\S]*?}/, '');

// Access grid
content = content.replace(/\.access-grid {([\s\S]*?)display: flex;\s*flex-wrap: wrap;\s*justify-content: center;([\s\S]*?)}/, '.access-grid {$1display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));$2}');
content = content.replace(/\.access-grid > \* {[\s\S]*?}/, '');

// Insight grid
content = content.replace(/\.insight-grid {([\s\S]*?)display: flex;\s*flex-wrap: wrap;\s*justify-content: center;([\s\S]*?)}/, '.insight-grid {$1display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));$2}');
content = content.replace(/\.insight-grid > \* {[\s\S]*?}/, '');

// Ensure standard grid children max-width (useful for all the grids we just created)
// Actually grid children implicitly behave well unless their contents overflow, so let's add a global rule for the grid children
content += `
/* Dashboard Grid Children constraints */
.stats-row > *,
.quick-actions > *,
.access-grid > *,
.insight-grid > * {
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
`;

fs.writeFileSync(cssPath, content, 'utf8');
console.log('Fixed dashboard.css');
