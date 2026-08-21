const fs = require('fs');

const md = fs.readFileSync('./ite302c_data.md', 'utf8');
const pdf = fs.readFileSync('./ite302c_pdf_text.txt', 'utf8');

const { parseMarkdownToQuestions } = require('./parser.js');
const questions = parseMarkdownToQuestions(md);

console.log('Searching for "merit" and "parity" questions in ITE302c dataset...');

const meritQuestions = questions.filter(q => {
  const str = (q.question + ' ' + q.options.map(o => o.text).join(' ')).toLowerCase();
  return str.includes('merit') || str.includes('parity');
});

console.log(`Found ${meritQuestions.length} questions matching "merit" or "parity":\n`);

meritQuestions.forEach(q => {
  console.log(`--------------------------------------------------`);
  console.log(`📌 Câu ${q.id}: ${q.question}`);
  q.options.forEach(opt => {
    console.log(`   - ${opt.key}. ${opt.text}`);
  });
  console.log(`✅ Đáp án đúng: [ ${q.correctAnswers.join(', ')} ]`);
});
