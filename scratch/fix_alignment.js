const fs = require('fs');
const path = require('path');

const cssDir = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css');

// 1. Fix pricing.css
const pricingPath = path.join(cssDir, 'pricing.css');
let pricingContent = fs.readFileSync(pricingPath, 'utf8');

const pricingSelectors = [
  'pricing-why__grid',
  'pricing-plans__grid',
  'pricing-features__grid',
  'pricing-roi__grid',
  'pricing-clinic__grid'
];

pricingSelectors.forEach(selector => {
  const regex = new RegExp(`(\\.${selector}\\s*{[^}]*margin-top:\\s*[^;]+;)`, 'g');
  pricingContent = pricingContent.replace(regex, `$1\n  max-width: 1200px;\n  margin-inline: auto;`);
});

// For .pricing-compare__table-wrapper, let's see how it's defined or just append it.
if (!pricingContent.includes('.pricing-compare__table-wrapper {')) {
  pricingContent += `\n.pricing-compare__table-wrapper {\n  max-width: 1200px;\n  margin-inline: auto;\n}\n`;
} else {
  pricingContent = pricingContent.replace(/(\.pricing-compare__table-wrapper\s*{[^}]*)}/, `$1  max-width: 1200px;\n  margin-inline: auto;\n}`);
}

fs.writeFileSync(pricingPath, pricingContent, 'utf8');
console.log('Fixed pricing.css');

// 2. Fix contact.css
const contactPath = path.join(cssDir, 'contact.css');
let contactContent = fs.readFileSync(contactPath, 'utf8');

const contactSelectors = [
  'contact-options__grid',
  'contact-social__grid',
  'contact-depts__grid',
  'contact-trust__grid'
];

contactSelectors.forEach(selector => {
  const regex = new RegExp(`(\\.${selector}\\s*{[^}]*margin-top:\\s*[^;]+;)`, 'g');
  contactContent = contactContent.replace(regex, `$1\n  max-width: 1200px;\n  margin-inline: auto;`);
});

// Fix .contact-main__grid
contactContent = contactContent.replace(/(\.contact-main__grid\s*{[^}]*align-items:\s*start;)/, `$1\n  max-width: 1200px;\n  margin-inline: auto;`);

fs.writeFileSync(contactPath, contactContent, 'utf8');
console.log('Fixed contact.css');
