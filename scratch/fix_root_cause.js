const fs = require('fs');
const path = require('path');

const cssDir = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css');

// 1. Process pricing.css
const pricingPath = path.join(cssDir, 'pricing.css');
let pricingContent = fs.readFileSync(pricingPath, 'utf8');

// Remove max-width and margin-inline from grids
const pricingGridsToRemove = [
  'pricing-why__grid',
  'pricing-plans__grid',
  'pricing-features__grid',
  'pricing-roi__grid',
  'pricing-clinic__grid'
];

pricingGridsToRemove.forEach(cls => {
  const regex = new RegExp(`(\\.${cls}\\s*{[^}]*?)\\s*max-width:\\s*1200px;\\s*margin-inline:\\s*auto;`, 'g');
  pricingContent = pricingContent.replace(regex, '$1');
});

// Remove from table wrapper
pricingContent = pricingContent.replace(/(\.pricing-compare__table-wrapper\s*{[^}]*?)\\s*max-width:\\s*1200px;\\s*margin-inline:\\s*auto;/, '$1');

// Adjust minmax
// pricing-plans__grid: minmax(320px -> 280px
pricingContent = pricingContent.replace(/(\.pricing-plans__grid\s*{[^}]*?minmax\()320px/g, '$1280px');
// pricing-why__grid: minmax(280px -> 220px
pricingContent = pricingContent.replace(/(\.pricing-why__grid\s*{[^}]*?minmax\()280px/g, '$1220px');
// pricing-roi__grid: minmax(280px -> 220px
pricingContent = pricingContent.replace(/(\.pricing-roi__grid\s*{[^}]*?minmax\()280px/g, '$1220px');
// pricing-clinic__grid: minmax(280px -> 220px
pricingContent = pricingContent.replace(/(\.pricing-clinic__grid\s*{[^}]*?minmax\()280px/g, '$1220px');

fs.writeFileSync(pricingPath, pricingContent, 'utf8');
console.log('Fixed pricing.css');

// 2. Process contact.css
const contactPath = path.join(cssDir, 'contact.css');
let contactContent = fs.readFileSync(contactPath, 'utf8');

// Remove max-width and margin-inline from grids
const contactGridsToRemove = [
  'contact-options__grid',
  'contact-main__grid',
  'contact-social__grid',
  'contact-depts__grid',
  'contact-trust__grid'
];

contactGridsToRemove.forEach(cls => {
  const regex = new RegExp(`(\\.${cls}\\s*{[^}]*?)\\s*max-width:\\s*1200px;\\s*margin-inline:\\s*auto;`, 'g');
  contactContent = contactContent.replace(regex, '$1');
});

// Adjust minmax
// contact-options__grid: minmax(280px -> 220px
contactContent = contactContent.replace(/(\.contact-options__grid\s*{[^}]*?minmax\()280px/g, '$1220px');
// contact-depts__grid: minmax(280px -> 220px
contactContent = contactContent.replace(/(\.contact-depts__grid\s*{[^}]*?minmax\()280px/g, '$1220px');
// contact-trust__grid: minmax(280px -> 220px
contactContent = contactContent.replace(/(\.contact-trust__grid\s*{[^}]*?minmax\()280px/g, '$1220px');
// contact-social__grid: minmax(280px -> 180px
contactContent = contactContent.replace(/(\.contact-social__grid\s*{[^}]*?minmax\()280px/g, '$1180px');

fs.writeFileSync(contactPath, contactContent, 'utf8');
console.log('Fixed contact.css');
