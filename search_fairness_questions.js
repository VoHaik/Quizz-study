const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const md = fs.readFileSync('./ite302c_data.md', 'utf8');
const questions = parseMarkdownToQuestions(md);

console.log(`Searching across ${questions.length} questions in ITE302c...`);

// Keywords related to fairness, parity, bias, ethics concepts
const fairnessKeywords = [
  'fairness', 'parity', 'statistical parity', 'error rate', 'demographic',
  'merit', 'equity', 'equality', 'bias', 'discrimina', 'justice',
  'predictive', 'calibration', 'disparate', 'algorithm'
];

const matchedQuestions = questions.filter(q => {
  const fullText = (q.question + ' ' + q.options.map(o => o.text).join(' ')).toLowerCase();
  return fairnessKeywords.some(kw => fullText.includes(kw));
});

console.log(`Found ${matchedQuestions.length} questions related to Fairness & Algorithmic Ethics.`);

// Group matched questions by sub-topics:
// 1. Types of Fairness Metrics (Statistical Parity, Error Rate Parity, etc.)
// 2. Types of Bias (Automation Bias, Historical Bias, Selection Bias, Measurement Bias)
// 3. Ethical Principles & Frameworks (Human Autonomy, Transparency, Accountability)
// 4. Privacy & Data Protection

const fairnessMetrics = [];
const biasTypes = [];
const ethicalPrinciples = [];

matchedQuestions.forEach(q => {
  const txt = (q.question + ' ' + q.options.map(o => o.text).join(' ')).toLowerCase();
  if (txt.includes('parity') || txt.includes('fairness') || txt.includes('merit') || txt.includes('equity')) {
    fairnessMetrics.push(q);
  } else if (txt.includes('bias') || txt.includes('discrimina')) {
    biasTypes.push(q);
  } else {
    ethicalPrinciples.push(q);
  }
});

console.log(`\nCategory 1: Fairness Metrics (${fairnessMetrics.length} questions)`);
console.log(`Category 2: Types of Bias (${biasTypes.length} questions)`);
console.log(`Category 3: Ethical Principles (${ethicalPrinciples.length} questions)`);

// Output detailed list of Category 1 & 2 for synthesis
fs.writeFileSync('./fairness_summary.json', JSON.stringify({
  fairnessMetrics,
  biasTypes
}, null, 2));

console.log('Saved fairness summary to fairness_summary.json');
