const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const md = fs.readFileSync('./data.md', 'utf8');
const questions = parseMarkdownToQuestions(md);

const q153 = questions.find(q => q.id === 153);
const q154 = questions.find(q => q.id === 154);

console.log('Q153:');
console.log(JSON.stringify(q153, null, 2));

console.log('\nQ154:');
console.log(JSON.stringify(q154, null, 2));
