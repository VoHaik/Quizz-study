const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const md = fs.readFileSync('./data.md', 'utf8');

const questions = parseMarkdownToQuestions(md);

const q145 = questions.find(q => q.id === 145);
const q148 = questions.find(q => q.id === 148);

console.log('=== QUESTION 145 ===');
console.log(JSON.stringify(q145, null, 2));

console.log('\n=== QUESTION 148 ===');
console.log(JSON.stringify(q148, null, 2));
