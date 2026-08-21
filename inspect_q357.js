const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const md = fs.readFileSync('./ite302c_data.md', 'utf8');
const questions = parseMarkdownToQuestions(md);

const q357 = questions.find(q => q.id === 357);
console.log('Q357 parsed object:');
console.log(JSON.stringify(q357, null, 2));

// Check any question in ite302c_data.md that starts with a single letter A, B, C, D, E in question title
const titleWithLetter = [];
questions.forEach(q => {
  if (q.question.match(/^[A-E]\s+[A-Z]/)) {
    titleWithLetter.push({ id: q.id, title: q.question, ans: q.correctAnswers });
  }
});

console.log(`\nFound ${titleWithLetter.length} questions with leading single letter in title:`);
titleWithLetter.forEach(item => console.log(` - Q${item.id}: [Ans: ${item.ans.join('')}] "${item.title}"`));
