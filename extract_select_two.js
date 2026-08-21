const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const iteMd = fs.readFileSync('./ite302c_data.md', 'utf8');
const mlnMd = fs.readFileSync('./data.md', 'utf8');

const iteQuestions = parseMarkdownToQuestions(iteMd);
const mlnQuestions = parseMarkdownToQuestions(mlnMd);

// Filter all questions with 2 or more correct answers, OR question text contains "Select two" or "(select two"
const selectTwoIte = iteQuestions.filter(q => {
  const isMultiAns = q.correctAnswers && q.correctAnswers.length >= 2;
  const isTextSelectTwo = q.question.toLowerCase().includes('select two') || q.question.toLowerCase().includes('select 2');
  return isMultiAns || isTextSelectTwo;
});

const selectTwoMln = mlnQuestions.filter(q => {
  return q.correctAnswers && q.correctAnswers.length >= 2;
});

console.log(`Found ${selectTwoIte.length} Select-Two / Multi-select questions in ITE302c.`);
console.log(`Found ${selectTwoMln.length} Multi-select questions in MLN122.`);

fs.writeFileSync('./select_two_questions.json', JSON.stringify({
  ite: selectTwoIte,
  mln: selectTwoMln
}, null, 2));

console.log('Saved to select_two_questions.json');
