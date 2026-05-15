const fs = require('fs');
const path = require('path');

const replacements = {
  // Dark Pink to Oceana (#009DC4)
  '#C0577A': '#009DC4',
  '#D4597A': '#009DC4',
  '#E05585': '#009DC4',
  '224, 85, 133': '0, 157, 196', // RGB for Oceana
  '#E05585': '#009DC4',
  
  // Light Pink to Light Sky Blue (#87CEFA and variants)
  'rgba(253, 238, 244': 'rgba(135, 206, 250',
  '#FDEEF4': '#E1F5FE', // Very light sky blue for bg
  '#F0B8CE': '#87CEFA', // Light sky blue
  '#F4A0C0': '#87CEFA', 
  '#F8DDE6': '#E1F5FE',
  
  // Grayish Pink
  '#9A7A85': '#5C8DA6'
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [key, value] of Object.entries(replacements)) {
        if (content.includes(key)) {
          // Replace all occurrences
          content = content.split(key).join(value);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(__dirname, 'src'));
console.log('Replacement complete.');
