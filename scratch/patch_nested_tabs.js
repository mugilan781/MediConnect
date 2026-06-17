const fs = require('fs');
const path = require('path');

const cssPath = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css', 'dashboard.css');
let content = fs.readFileSync(cssPath, 'utf8');

// Replace nested tabs
content = content.replace(/\.nested-tabs {([\s\S]*?)overflow-x: auto;([\s\S]*?)}/, '.nested-tabs {$1flex-wrap: wrap;$2}');

fs.writeFileSync(cssPath, content, 'utf8');
console.log('Fixed nested-tabs in dashboard.css');
