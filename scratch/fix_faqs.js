const fs = require('fs');
const path = require('path');

const projectDir = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect');

// 1. Fix faq.css centering
const faqCssPath = path.join(projectDir, 'public', 'css', 'faq.css');
let faqCss = fs.readFileSync(faqCssPath, 'utf8');

// Replace .faq-tabs__inner with the centered version
faqCss = faqCss.replace(/\.faq-tabs__inner\s*{[\s\S]*?}/, `.faq-tabs__inner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  width: max-content;
  max-width: 100%;
  margin: 0 auto;
}`);
fs.writeFileSync(faqCssPath, faqCss, 'utf8');
console.log('Fixed faq.css');


// 2. Fix consultations.html
const consultHtmlPath = path.join(projectDir, 'public', 'consultations.html');
let consultHtml = fs.readFileSync(consultHtmlPath, 'utf8');

consultHtml = consultHtml.replace(/<section class="consult-faq animate-on-scroll">/g, '<section class="faq-preview-section animate-on-scroll">');
consultHtml = consultHtml.replace(/<div class="consult-faq-list"/g, '<div class="faq-preview-list"');
consultHtml = consultHtml.replace(/<div class="consult-faq-item">/g, '<div class="faq-preview-item reveal">');
consultHtml = consultHtml.replace(/<button class="consult-faq-question" onclick="ConsultPage\.toggleFaq\(this\)">/g, '<button class="faq-preview-question" onclick="toggleFaq(this)">');
consultHtml = consultHtml.replace(/<span class="icon">▼<\/span>/g, '<span class="faq-chevron">\n                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>\n              </span>');
consultHtml = consultHtml.replace(/<div class="consult-faq-answer">/g, '<div class="faq-preview-answer">');
consultHtml = consultHtml.replace(/<div class="consult-faq-answer-inner">/g, '<div class="faq-preview-answer-inner">');

fs.writeFileSync(consultHtmlPath, consultHtml, 'utf8');
console.log('Fixed consultations.html');


// 3. Fix online-consultation.js
const consultJsPath = path.join(projectDir, 'public', 'js', 'online-consultation.js');
let consultJs = fs.readFileSync(consultJsPath, 'utf8');

consultJs = consultJs.replace(/class="consult-faq-item"/g, 'class="faq-preview-item reveal"');
consultJs = consultJs.replace(/class="consult-faq-question" onclick="ConsultPage\.toggleFaq\(this\)"/g, 'class="faq-preview-question" onclick="toggleFaq(this)"');
consultJs = consultJs.replace(/<span class="icon">▼<\/span>/g, '<span class="faq-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></span>');
consultJs = consultJs.replace(/class="consult-faq-answer"/g, 'class="faq-preview-answer"');
consultJs = consultJs.replace(/class="consult-faq-answer-inner"/g, 'class="faq-preview-answer-inner"');

// Wait! If the user clicks toggleFaq, it calls global window.toggleFaq.
// We can just comment out ConsultPage.toggleFaq to keep the object clean, but let's just leave it or remove it.
consultJs = consultJs.replace(/toggleFaq\(btn\) \{[\s\S]*?\},/g, ''); // Removes toggleFaq method completely

fs.writeFileSync(consultJsPath, consultJs, 'utf8');
console.log('Fixed online-consultation.js');
