const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const iteMd = fs.readFileSync('./ite302c_data.md', 'utf8');
const questions = parseMarkdownToQuestions(iteMd);

const q145 = questions.find(q => q.id === 145);
const q148 = questions.find(q => q.id === 148);

console.log('=== ITE302C Q145 ===');
console.log(JSON.stringify(q145, null, 2));

console.log('\n=== ITE302C Q148 ===');
console.log(JSON.stringify(q148, null, 2));

// Check how many questions in ite302c_data.md have "AB" inserted inside words
const corruptedWords = [];
for (let line of iteMd.split('\n')) {
  if (line.match(/\b\w*AB\w*\b/) && !line.includes('**Đáp án đúng:**') && !line.includes('- AB') && !line.includes('AB.')) {
    corruptedWords.push(line.trim());
  }
}
console.log(`\nFound ${corruptedWords.length} lines with corrupted "AB" inside words in ite302c_data.md:`);
corruptedWords.slice(0, 10).forEach(l => console.log(' - ' + l));
