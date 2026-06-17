const fs = require('fs');
const path = require('path');

const cssDir = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css');

// 1. Process pricing.css
const pricingPath = path.join(cssDir, 'pricing.css');
let pricingContent = fs.readFileSync(pricingPath, 'utf8');

// Remove Layout Centering Override block
pricingContent = pricingContent.replace(/\/\* ── Layout Centering Override ── \*\/[\s\S]*?(?=\/\*|$)/, '');

// Revert minmax widths
pricingContent = pricingContent.replace(/minmax\(220px/g, 'minmax(280px');
pricingContent = pricingContent.replace(/minmax\(280px,\s*1fr\)/g, (match, offset, str) => {
  // We need to only replace the one for pricing-plans__grid.
  // The global replace might be too aggressive if we don't scope it, but earlier we saw that pricing-plans used 320px.
  return match; // We'll scope the 320px replacement.
});

// Specifically target pricing-plans__grid
pricingContent = pricingContent.replace(/(\.pricing-plans__grid\s*{[^}]*?minmax\()280px/g, '$1320px');


fs.writeFileSync(pricingPath, pricingContent.trim() + '\n', 'utf8');
console.log('Fixed pricing.css');

// 2. Process contact.css
const contactPath = path.join(cssDir, 'contact.css');
let contactContent = fs.readFileSync(contactPath, 'utf8');

// Remove Layout Centering Override block
contactContent = contactContent.replace(/\/\* ── Layout Centering Override ── \*\/[\s\S]*?(?=\/\*|$)/, '');

// Revert minmax widths
contactContent = contactContent.replace(/minmax\(220px/g, 'minmax(280px');
contactContent = contactContent.replace(/minmax\(180px/g, 'minmax(280px');

fs.writeFileSync(contactPath, contactContent.trim() + '\n', 'utf8');
console.log('Fixed contact.css');
