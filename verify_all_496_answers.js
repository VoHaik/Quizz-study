const fs = require('fs');

const rawPdf = fs.readFileSync('./pdf_text_pypdf.txt', 'utf8');
let md = fs.readFileSync('./data.md', 'utf8');

const cardBlocks = rawPdf.split(/\n(?=\d+\.\s+)/);
const pdfAnswers = new Map();

for (let block of cardBlocks) {
  block = block.trim();
  const m = block.match(/^(\d+)\.\s*/);
  if (!m) continue;
  const qId = parseInt(m[1], 10);

  const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let ansLetter = "";

  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (/^\d+\s*\/\s*122$/.test(l)) continue;
    if (l.includes('MLN122_') || l.includes('quizlet.com') || l.includes('Hoc trực tuyến')) continue;

    const ansM = l.match(/^`?([A-E]{1,4})`?(\s*[\(\`].*)?$/);
    if (ansM) {
      ansLetter = ansM[1].toUpperCase();
      break;
    }
  }

  if (qId && ansLetter) {
    pdfAnswers.set(qId, ansLetter);
  }
}

console.log(`Extracted answers from raw PDF for ${pdfAnswers.size} questions.`);
console.log('Q5 PDF answer:', pdfAnswers.get(5));
console.log('Q34 PDF answer:', pdfAnswers.get(34));

const { parseMarkdownToQuestions } = require('./parser.js');
const questions = parseMarkdownToQuestions(md);

let mismatchCount = 0;
for (let q of questions) {
  const expected = pdfAnswers.get(q.id);
  if (expected && !q.correctAnswers.includes(expected)) {
    console.log(`Mismatch Q${q.id}: data.md has [${q.correctAnswers.join(', ')}], PDF original had ${expected}`);
    mismatchCount++;

    // Replace in data.md
    const pattern = new RegExp(`### Câu ${q.id}\\n\\*\\*Câu hỏi:\\*\\*([^\\n]+)\\n((?:- [A-E]\\. [^\\n]+\\n)+)\\n\\*\\*Đáp án đúng:\\*\\* \`[^\`]+\``);
    const replacement = `### Câu ${q.id}\n**Câu hỏi:**$1\n$2\n**Đáp án đúng:** \`${expected}\``;
    md = md.replace(pattern, replacement);
  }
}

console.log(`Total mismatches found and corrected: ${mismatchCount}`);
fs.writeFileSync('./data.md', md, 'utf8');
