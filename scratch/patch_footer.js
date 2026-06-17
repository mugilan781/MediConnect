const fs = require('fs');
const path = require('path');

const footerPath = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css', 'footer.css');
let content = fs.readFileSync(footerPath, 'utf8');

// Replace global-footer__inner
content = content.replace(
  /\.global-footer__inner {\s*max-width: var\(--container-width\);\s*margin: 0 auto;\s*padding: var\(--space-16\) var\(--space-6\) 0;/,
  `.global-footer__inner {
  width: 100%;
  padding: var(--space-16) 80px 0;`
);

// Replace global-footer__bottom-inner
content = content.replace(
  /\.global-footer__bottom-inner {\s*max-width: var\(--container-width\);\s*margin: 0 auto;\s*padding: 0 var\(--space-6\);/,
  `.global-footer__bottom-inner {
  width: 100%;
  padding: 0 80px;`
);

// Add media queries at the end for padding
const mediaQueries = `

@media (max-width: 1024px) {
  .global-footer__inner { padding: var(--space-16) 40px 0; }
  .global-footer__bottom-inner { padding: 0 40px; }
}

@media (max-width: 768px) {
  .global-footer__inner { padding: var(--space-16) 20px 0; }
  .global-footer__bottom-inner { padding: 0 20px; }
}
`;

content += mediaQueries;

fs.writeFileSync(footerPath, content, 'utf8');
console.log('footer.css patched.');
