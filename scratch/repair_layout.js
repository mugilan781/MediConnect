const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css', 'layout.css');
let content = fs.readFileSync(filePath, 'utf8');

const missingBlock = `  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

.topbar__user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.topbar__user:hover { background: var(--color-gray-100); }

.topbar__user-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.topbar__user-role {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

/* ── Content Area ── */
.content {
  flex: 1;
  padding: var(--space-8) 80px;
  width: 100%;
  position: relative;
}

/* ── Page Header ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-8);
  flex-wrap: wrap;
  gap: var(--space-4);
}

.page-header__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0;
}

.page-header__subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-light);
  margin-top: var(--space-1);
}

/* ── Grid System ── */
.grid {
  display: grid;
  gap: var(--space-6);
`;

content = content.replace(
  `  font-weight: var(--font-weight-bold);
  display: flex;
}

.grid--2 {`,
  `  font-weight: var(--font-weight-bold);
  display: flex;
${missingBlock}}

.grid--2 {`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Restored layout.css successfully!');
