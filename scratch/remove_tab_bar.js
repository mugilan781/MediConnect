const fs = require('fs');
const path = require('path');

const publicDir = path.join('c:', 'MUGILAN', 'MR Coderz Hub', 'Project 7', 'MediConnect', 'public');
const adminHtmlPath = path.join(publicDir, 'admin-dashboard.html');
const doctorHtmlPath = path.join(publicDir, 'doctor-dashboard.html');

function removeTabBar(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Use regex to remove <div class="tab-bar">...</div>
  // Assumes the tab bar is a single div containing buttons and ends with </div>
  const regex = /<div class="tab-bar">[\s\S]*?<\/div>/;
  if (regex.test(content)) {
    content = content.replace(regex, '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Removed tab-bar from ${path.basename(filePath)}`);
  } else {
    console.log(`tab-bar not found in ${path.basename(filePath)}`);
  }
}

removeTabBar(adminHtmlPath);
removeTabBar(doctorHtmlPath);
