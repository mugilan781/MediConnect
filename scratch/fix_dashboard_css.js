// Restore the top of dashboard.css
const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'public', 'css', 'dashboard.css');
const content = fs.readFileSync(cssPath, 'utf8');

// Find where .stat-card { begins (the first reliable anchor after the corrupted section)
const anchor = '\n.stat-card {';
const anchorIdx = content.indexOf(anchor);
if (anchorIdx === -1) {
  console.error('Could not find .stat-card anchor');
  process.exit(1);
}

const rest = content.substring(anchorIdx);

const top = `/* ============================================================
   MediConnect – dashboard.css
   Premium Healthcare SaaS Dashboard
   10-Section Layout with glass cards & smooth interactions
   ============================================================ */

/* ── App Layout ── */
.app {
  display: flex;
  box-sizing: border-box;
  overflow-x: hidden;
  min-height: calc(100vh - var(--navbar-height, 64px));
  padding-top: var(--navbar-height, 64px);
}

.main {
  flex: 1;
  margin-left: 260px;
  transition: margin-left var(--transition-base);
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: auto;
  max-width: 100%;
}

.content {
  flex: 1;
  padding: var(--space-6) var(--space-8);
  min-width: 0;
  width: auto;
  max-width: 100%;
  box-sizing: border-box;
}

.content.fade-in {
  animation: dashFadeIn 0.4s ease;
}

@keyframes dashFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Demo Mode Badge ── */
.demo-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  font-size: 11px;
  font-weight: 600;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.28);
  border-radius: 20px;
  letter-spacing: 0.04em;
  white-space: nowrap;
  margin-left: var(--space-3);
  animation: demoBadgePulse 2.5s ease-in-out infinite;
}

@keyframes demoBadgePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* ════════════════════════════════════════════════════════════
   SECTION 1: HERO OVERVIEW — Welcome Banner
   ════════════════════════════════════════════════════════════ */
.welcome-banner {
  background:
    radial-gradient(circle at 82% 24%, rgba(255, 255, 255, 0.18), transparent 28%),
    linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 52%, var(--color-accent) 100%);
  border-radius: var(--radius-lg);
  padding: var(--space-8) var(--space-10);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-7);
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-primary-lg);
  max-width: 100%;
  box-sizing: border-box;
}

.welcome-banner::before {
  content: '';
  position: absolute;
  top: -40%; right: -5%;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}

.welcome-banner::after {
  content: '';
  position: absolute;
  bottom: -20%; right: 15%;
  width: 250px; height: 250px;
  background: rgba(255,255,255,0.03);
  border-radius: 50%;
  pointer-events: none;
}

.welcome-banner__content {
  position: relative;
  z-index: 1;
}

.welcome-banner__greeting {
  font-size: var(--font-size-base);
  opacity: 0.85;
  margin-bottom: var(--space-1);
}

.welcome-banner__name {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--space-1);
  line-height: 1.2;
}

.welcome-banner__message {
  opacity: 0.8;
  font-size: var(--font-size-base);
}

/* ════════════════════════════════════════════════════════════
   SECTION 2: KPI CARDS — Stats Row
   ════════════════════════════════════════════════════════════ */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
  margin-bottom: var(--space-7);
}
`;

fs.writeFileSync(cssPath, top + rest, 'utf8');
console.log('✅ dashboard.css restored successfully');
