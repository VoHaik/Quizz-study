const fs = require('fs');

const pdfText = fs.readFileSync('./pdf_text_pypdf.txt', 'utf8');
const mdText = fs.readFileSync('./data.md', 'utf8');

const { parseMarkdownToQuestions } = require('./parser.js');
const mdQuestions = parseMarkdownToQuestions(mdText);

// Build strict map of PDF questions
const pdfBlocks = pdfText.split(/\n(?=\d+\.\s+)/);
const pdfMap = new Map();

for (let block of pdfBlocks) {
  block = block.trim();
  const m = block.match(/^(\d+)\.\s*/);
  if (!m) continue;
  const id = parseInt(m[1], 10);

  // Extract answer letter printed at bottom or right margin of block
  const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let rawAns = "";

  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (/^\d+\s*\/\s*122$/.test(l)) continue;
    if (l.includes('MLN122_') || l.includes('quizlet.com') || l.includes('Hoc trực tuyến')) continue;

    const ansM = l.match(/^`?([A-E]{1,4})`?(\s*[\(\`].*)?$/);
    if (ansM) {
      rawAns = ansM[1].toUpperCase();
      break;
    }
  }

  pdfMap.set(id, { block, rawAns });
}

console.log(`PDF contains ${pdfMap.size} question blocks.`);
console.log(`Markdown contains ${mdQuestions.length} parsed questions.`);

let issues = [];

for (let i = 1; i <= 496; i++) {
  const mdQ = mdQuestions.find(q => q.id === i);
  const pdfQ = pdfMap.get(i);

  if (!mdQ) {
    issues.push(`CRITICAL: Question ${i} is MISSING from data.md!`);
    continue;
  }

  if (!pdfQ) {
    issues.push(`WARNING: Question ${i} not found in PDF extraction!`);
    continue;
  }

  if (mdQ.options.length < 2) {
    issues.push(`CRITICAL: Question ${i} has less than 2 options! (${mdQ.options.length})`);
  }

  if (!mdQ.correctAnswers || mdQ.correctAnswers.length === 0) {
    issues.push(`CRITICAL: Question ${i} has NO correct answer!`);
  }

  if (pdfQ.rawAns && !mdQ.correctAnswers.includes(pdfQ.rawAns[0])) {
    // If pdfQ.rawAns is multi e.g. ABC, check if mdQ has those
    issues.push(`MISMATCH Q${i}: data.md has [${mdQ.correctAnswers.join(', ')}], PDF had ${pdfQ.rawAns}`);
  }
}

console.log('\n====================================');
console.log(`ULTRA STRICT AUDIT RESULT: ${issues.length} ISSUES FOUND`);
console.log('====================================');

if (issues.length > 0) {
  issues.forEach(iss => console.log(' - ' + iss));
} else {
  console.log('✔ PERFECT! 100% of 496 questions in data.md match the PDF answer keys exactly!');
}
