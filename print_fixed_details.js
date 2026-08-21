const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const md = fs.readFileSync('./ite302c_data.md', 'utf8');
const questions = parseMarkdownToQuestions(md);

const targetIds = [69, 145, 148, 164, 252, 254, 353, 357, 360];

console.log('=== FULL DETAILS OF CORRECTED ITE302C QUESTIONS ===\n');

targetIds.forEach(id => {
  const q = questions.find(item => item.id === id);
  if (q) {
    console.log(`--------------------------------------------------`);
    console.log(`📌 Câu ${q.id}: ${q.question}`);
    q.options.forEach(opt => {
      console.log(`   - ${opt.key}. ${opt.text}`);
    });
    console.log(`✅ DAP AN DUNG CONG BO: [ ${q.correctAnswers.join(', ')} ]\n`);
  }
});
