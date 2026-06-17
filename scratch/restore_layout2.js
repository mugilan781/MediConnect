const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css', 'layout.css');
let content = fs.readFileSync(filePath, 'utf8');

const missingBlock = `}

.grid--2 { grid-template-columns: repeat(2, 1fr); }
.grid--3 { grid-template-columns: repeat(3, 1fr); }
.grid--4 { grid-template-columns: repeat(4, 1fr); }

.grid--stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}
.grid--stats > * {
  flex: 1 1 280px;
  max-width: 360px;
}

/* ── Public Page Layout (no sidebar) ── */
.public-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding-top: var(--navbar-height);
}`;

content = content.replace(
  /}\s*flex-direction: column;\s*padding-top: var\(--navbar-height\);\s*}/g,
  `${missingBlock}`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Restored layout.css successfully!');
