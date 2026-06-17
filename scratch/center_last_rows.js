const fs = require('fs');
const path = require('path');

const cssDir = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public', 'css');

// 1. Process pricing.css
const pricingPath = path.join(cssDir, 'pricing.css');
let pricingContent = fs.readFileSync(pricingPath, 'utf8');

const pricingFix = `
/* ── Align Incomplete Final Rows ── */
@media (min-width: 1024px) {
  .pricing-clinic__card:nth-child(5),
  .pricing-enterprise__card:nth-child(5) {
    grid-column-start: 2;
  }
}
`;
if (!pricingContent.includes('Align Incomplete Final Rows')) {
  pricingContent += pricingFix;
  fs.writeFileSync(pricingPath, pricingContent, 'utf8');
  console.log('Fixed pricing.css');
}

// 2. Process contact.css
const contactPath = path.join(cssDir, 'contact.css');
let contactContent = fs.readFileSync(contactPath, 'utf8');

// For contact-social, flexbox perfectly centers the odd number of cards without breaking layout
const contactFix = `
/* ── Align Incomplete Final Rows ── */
.contact-social__grid {
  display: flex !important;
  flex-wrap: wrap;
  justify-content: center;
}
.contact-social__link {
  flex: 1 1 250px !important;
  max-width: 320px;
}
`;
if (!contactContent.includes('Align Incomplete Final Rows')) {
  contactContent += contactFix;
  fs.writeFileSync(contactPath, contactContent, 'utf8');
  console.log('Fixed contact.css');
}
