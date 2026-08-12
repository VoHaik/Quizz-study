const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const md = fs.readFileSync('./data.md', 'utf8');
const questions = parseMarkdownToQuestions(md);

const q140 = questions.find(q => q.id === 140);
console.log('Q140 cleaned text:');
console.log(JSON.stringify(q140, null, 2));

// Search for any remaining "trịi" or "rịi" across all questions
const doubleMatches = [];
questions.forEach(q => {
  const fullStr = q.question + ' ' + q.options.map(o => o.text).join(' ');
  if (fullStr.includes('trịi') || fullStr.includes('rịi') || fullStr.includes('dụụ') || fullStr.includes('vụụ')) {
    doubleMatches.push(q.id);
  }
});

console.log('Any remaining double matches:', doubleMatches);
