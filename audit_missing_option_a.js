const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const md = fs.readFileSync('./ite302c_data.md', 'utf8');
const questions = parseMarkdownToQuestions(md);

const malformedQuestions = [];

questions.forEach(q => {
  const hasOptA = q.options.some(o => o.key === 'A');
  const optCount = q.options.length;

  if (!hasOptA || optCount < 4 || q.question.match(/\s+A\s+[A-Z]/)) {
    malformedQuestions.push({
      id: q.id,
      hasOptA,
      optCount,
      title: q.question,
      options: q.options
    });
  }
});

console.log(`Found ${malformedQuestions.length} malformed questions in ite302c_data.md:`);
malformedQuestions.forEach(q => {
  console.log(`\n--------------------------------------------------`);
  console.log(`Q${q.id} (Opt A: ${q.hasOptA}, Total Opts: ${q.optCount}):`);
  console.log(` Title: "${q.title}"`);
  console.log(` Opts:`, q.options.map(o => `${o.key}: ${o.text}`).join(' | '));
});
