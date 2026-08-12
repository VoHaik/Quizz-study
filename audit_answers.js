const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const md = fs.readFileSync('./data.md', 'utf8');
const questions = parseMarkdownToQuestions(md);

console.log('Auditing Q34 specifically:');
const q34 = questions.find(q => q.id === 34);
console.log(JSON.stringify(q34, null, 2));

console.log('\nScanning for all questions with multiple correctAnswers or suspicious answers:');
for (let q of questions) {
  if (q.correctAnswers.length > 1) {
    console.log(`Q${q.id} has multiple answers: [${q.correctAnswers.join(', ')}], rawAnswer: "${q.rawAnswer}"`);
  }
}
