const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/js/admin-dashboard.js');
const fileContent = fs.readFileSync(filePath, 'utf8');
const lines = fileContent.split('\n');

lines.forEach((line, index) => {
  if (line.includes('handleCmsSaveSubmit') || line.includes('handleSettingsSaveSubmit')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
