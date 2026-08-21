const fs = require('fs');

const rawPdf = fs.readFileSync('./ite302c_pdf_text.txt', 'utf8');

// 1. Clean ALL page headers and footers globally FIRST before block splitting
let cleanDoc = rawPdf;

// Remove page headers and footers lines globally
cleanDoc = cleanDoc.replace(/=== PAGE \d+ ===/g, '');
cleanDoc = cleanDoc.replace(/^\d+\s*\/\s*\d+$/gm, '');
cleanDoc = cleanDoc.replace(/^ITE302c\s*-\s*CHUẨN\s*NHUNG\s*HOÀNG$/gm, '');
cleanDoc = cleanDoc.replace(/^Study\s*online\s*at\s*https:\/\/quizlet\.com\/.*$/gm, '');

// Re-join hyphenated words split across line breaks (e.g. "im-" + "provement" -> "improvement")
cleanDoc = cleanDoc.replace(/(\b[a-zA-Z]+)-\s*\n\s*([a-zA-Z]+\b)/g, '$1$2');

// Split into blocks by question number \n(?=\d+\.\s+)
const blocks = cleanDoc.split(/\n(?=\d+\.\s+)/);

const verifiedQuestions = [];

for (let block of blocks) {
  block = block.trim();
  if (!block) continue;

  const m = block.match(/^(\d+)\.\s*/);
  if (!m) continue;

  const qId = parseInt(m[1], 10);
  let rest = block.substring(m[0].length).trim();

  let answerKey = "";

  // Check inline answer key right after number e.g. "357. B" -> rest starts with "B\n" or "B "
  const leadingAnsMatch = rest.match(/^([A-E]{1,4})\s*\n/);
  if (leadingAnsMatch) {
    answerKey = leadingAnsMatch[1].toUpperCase();
    rest = rest.substring(leadingAnsMatch[0].length).trim();
  }

  const lines = rest.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let questionText = "";
  let options = [];
  let optionKeysSeq = ['A', 'B', 'C', 'D', 'E'];
  let currentOptIdx = 0;
  let inQuestion = true;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check standalone answer key line at page break or end of card
    if (/^[A-E]{1,4}(\s*[\(\`].*)?$/i.test(line)) {
      const keyCand = line.match(/^[A-E]{1,4}/i)[0].toUpperCase();
      if (!answerKey || options.length >= 2) {
        answerKey = keyCand;
      }
      continue;
    }

    // Check option match e.g. "A. ...", "B. ..."
    const optMatch = line.match(/^(?:-\s*)?([A-Ea-e])\s*[\.\:\)]\s+(.*)/);
    if (optMatch) {
      const key = optMatch[1].toUpperCase();
      let text = optMatch[2].trim();

      // Check trailing answer key at end of option text
      const trailingAns = text.match(/(.*?)\s+([A-E]{1,4})$/);
      if (trailingAns) {
        text = trailingAns[1].trim();
        if (!answerKey) answerKey = trailingAns[2].toUpperCase();
      }

      const expectedKey = optionKeysSeq[currentOptIdx];
      if (key === expectedKey || options.length < 5) {
        inQuestion = false;
        options.push({ key, text });
        currentOptIdx = options.length;
        continue;
      }
    }

    if (inQuestion) {
      if (/^[A-E]{1,4}$/.test(line)) {
        if (!answerKey) answerKey = line.toUpperCase();
        continue;
      }
      questionText += line + ' ';
    } else if (options.length > 0) {
      if (/^[A-E]{1,4}$/.test(line)) {
        if (!answerKey) answerKey = line.toUpperCase();
        continue;
      }
      options[options.length - 1].text += ' ' + line;
    }
  }

  questionText = questionText.trim();

  // Strip orphan leading answer letters from questionText (e.g. "B How can..." -> "How can...")
  const orphanLeading = questionText.match(/^([A-E]{1,4})\s+(?=[A-Z0-9\(\"\'\?])/);
  if (orphanLeading) {
    if (!answerKey || answerKey === 'A') answerKey = orphanLeading[1];
    questionText = questionText.substring(orphanLeading[0].length).trim();
  }

  // Clean remaining text artifacts
  questionText = questionText.replace(/powAB\s*erful/g, 'powerful');
  questionText = questionText.replace(/\b([A-Z][a-z]+)AB\s*([a-z]+)\b/g, '$1$2');
  questionText = questionText.replace(/^(?:NHUNG HOÀNG|\(NHUNG HOÀNG\))\s*/g, '');
  questionText = questionText.replace(/\(NHUNG HOÀNG\)/g, '').trim();

  for (let opt of options) {
    opt.text = opt.text.replace(/\s+[A-E]{1,4}$/, '').trim();
    opt.text = opt.text.replace(/NHUNG HOÀNG|\(NHUNG HOÀNG\)/g, '').trim();
  }

  if (qId && questionText && options.length >= 2) {
    verifiedQuestions.push({
      id: qId,
      question: questionText,
      options,
      rawAnswer: answerKey || 'A'
    });
  }
}

verifiedQuestions.sort((a, b) => a.id - b.id);

// Load existing ite302c_data.md to log changes
const { parseMarkdownToQuestions } = require('./parser.js');
const oldMd = fs.readFileSync('./ite302c_data.md', 'utf8');
const oldQuestions = parseMarkdownToQuestions(oldMd);

const auditFixLogs = [];

for (let newQ of verifiedQuestions) {
  const oldQ = oldQuestions.find(q => q.id === newQ.id);
  if (oldQ) {
    const oldAns = oldQ.correctAnswers.join('');
    const newAns = newQ.rawAnswer;
    const oldTitle = oldQ.question;
    const newTitle = newQ.question;

    if (oldAns !== newAns || oldTitle !== newTitle) {
      auditFixLogs.push({
        id: newQ.id,
        oldTitle,
        newTitle,
        oldAns,
        newAns
      });
    }
  }
}

// Generate new pristine ite302c_data.md
let outMd = `# NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM ITE302c - CHUẨN NHUNG HOÀNG\n\n`;

for (let q of verifiedQuestions) {
  outMd += `### Câu ${q.id}\n`;
  outMd += `**Câu hỏi:** ${q.question}\n`;
  for (let opt of q.options) {
    outMd += `- ${opt.key}. ${opt.text}\n`;
  }
  outMd += `\n**Đáp án đúng:** \`${q.rawAnswer}\` \n\n`;
}

fs.writeFileSync('./ite302c_data.md', outMd, 'utf8');

console.log(`Audited all ${verifiedQuestions.length} ITE302c questions.`);
console.log(`Found and corrected ${auditFixLogs.length} issues in ite302c_data.md:`);

auditFixLogs.forEach(log => {
  console.log(`\n[Fix Q${log.id}]`);
  if (log.oldTitle !== log.newTitle) {
    console.log(` Title: "${log.oldTitle}" ==> "${log.newTitle}"`);
  }
  if (log.oldAns !== log.newAns) {
    console.log(` Answer Key: ${log.oldAns} ==> ${log.newAns}`);
  }
});
