const fs = require('fs');

const rawPdf = fs.readFileSync('./ite302c_pdf_text.txt', 'utf8');
let mdText = fs.readFileSync('./ite302c_data.md', 'utf8');

const { parseMarkdownToQuestions } = require('./parser.js');

// Parse raw PDF text question cards line by line
const cardBlocks = rawPdf.split(/\n(?=\d+\.\s+)/);
const pdfAnswers = new Map();

for (let block of cardBlocks) {
  block = block.trim();
  const m = block.match(/^(\d+)\.\s*/);
  if (!m) continue;
  const qId = parseInt(m[1], 10);

  // Extract answer letter line (e.g. "AB", "CD", "BC", "ABC", "A", "B", "C", "D")
  const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let ansLetter = "";

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\d+\s*\/\s*125$/.test(l)) continue;
    if (l.includes('ITE302c -') || l.includes('quizlet.com') || l.includes('Study online at')) continue;

    const ansM = l.match(/^`?([A-E]{1,4})`?(\s*[\(\`].*)?$/);
    if (ansM && !l.startsWith('- ') && !/^\d+\./.test(l)) {
      ansLetter = ansM[1].toUpperCase();
      // If we find multi-letter answer e.g. AB, CD, prioritize it
      if (ansLetter.length >= 2) break;
    }
  }

  if (qId && ansLetter) {
    pdfAnswers.set(qId, ansLetter);
  }
}

console.log(`Extracted PDF answers for ${pdfAnswers.size} questions.`);
console.log('Q145 PDF answer:', pdfAnswers.get(145));
console.log('Q148 PDF answer:', pdfAnswers.get(148));

const questions = parseMarkdownToQuestions(mdText);
let fixedCount = 0;

for (let q of questions) {
  const expected = pdfAnswers.get(q.id);
  if (expected && q.rawAnswer !== expected) {
    console.log(`Mismatch ITE302c Q${q.id}: md has ${q.rawAnswer}, PDF had ${expected}`);
    fixedCount++;

    const pattern = new RegExp(`### Câu ${q.id}\\n\\*\\*Câu hỏi:\\*\\*([^\\n]+)\\n((?:- [A-E]\\. [^\\n]+\\n)+)\\n\\*\\*Đáp án đúng:\\*\\* \`[^\`]+\``);
    const replacement = `### Câu ${q.id}\n**Câu hỏi:**$1\n$2\n**Đáp án đúng:** \`${expected}\``;
    mdText = mdText.replace(pattern, replacement);
  }
}

console.log(`Fixed ${fixedCount} answer key mismatches in ite302c_data.md.`);
fs.writeFileSync('./ite302c_data.md', mdText, 'utf8');
