const fs = require('fs');
const path = require('path');

const terminalDir = path.join(__dirname, '../../src/app/api/terminal');
fs.mkdirSync(terminalDir, { recursive: true });
console.log('Terminal API directory created:', terminalDir);
