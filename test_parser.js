const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const mdText = fs.readFileSync('./data.md', 'utf8');
const questions = parseMarkdownToQuestions(mdText);

console.log('Total parsed questions:', questions.length);
if (questions.length > 0) {
  console.log('First Q:', questions[0].id, questions[0].question);
  console.log('Last Q:', questions[questions.length - 1].id, questions[questions.length - 1].question);
  
  const missing = [];
  const qMap = new Map(questions.map(q => [q.id, q]));
  for (let i = 1; i <= 496; i++) {
    if (!qMap.has(i)) missing.push(i);
  }
  console.log('Missing IDs:', missing);

  // Check questions with no options or no correct answers
  const invalidOpts = questions.filter(q => q.options.length === 0);
  const invalidAns = questions.filter(q => q.correctAnswers.length === 0);
  console.log('Questions without options:', invalidOpts.map(q => q.id));
  console.log('Questions without correct answers:', invalidAns.map(q => q.id));
}
