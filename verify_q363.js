const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const md = fs.readFileSync('./ite302c_data.md', 'utf8');
const questions = parseMarkdownToQuestions(md);

const q363 = questions.find(q => q.id === 363);
console.log('=== Q363 PARSED OBJECT ===');
console.log(JSON.stringify(q363, null, 2));

const q220 = questions.find(q => q.id === 220);
console.log('\n=== Q220 PARSED OBJECT ===');
console.log(JSON.stringify(q220, null, 2));
