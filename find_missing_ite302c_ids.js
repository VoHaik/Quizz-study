const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const md = fs.readFileSync('./ite302c_data.md', 'utf8');
const questions = parseMarkdownToQuestions(md);

const parsedIds = new Set(questions.map(q => q.id));

const missingIds = [];
for (let i = 1; i <= 394; i++) {
  if (!parsedIds.has(i)) {
    missingIds.push(i);
  }
}

console.log(`Total parsed questions: ${questions.length}`);
console.log(`Missing Question IDs between 1 and 394:`, missingIds);
