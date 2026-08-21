const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const md = fs.readFileSync('./data.md', 'utf8');
const questions = parseMarkdownToQuestions(md);

const titleWithLetter = [];
questions.forEach(q => {
  if (q.question.match(/^[A-E]\s+[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ]/)) {
    titleWithLetter.push({ id: q.id, title: q.question, ans: q.correctAnswers });
  }
});

console.log(`MLN122 data.md: Found ${titleWithLetter.length} questions with leading single letter in title.`);
if (titleWithLetter.length > 0) {
  titleWithLetter.forEach(item => console.log(` - Q${item.id}: [Ans: ${item.ans.join('')}] "${item.title}"`));
}
