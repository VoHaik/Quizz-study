const fs = require('fs');

const rawPdf = fs.readFileSync('./ite302c_pdf_text.txt', 'utf8');

// Build strict original pdf mapping
const pages = rawPdf.split(/=== PAGE \d+ ===/);
let cleanDoc = rawPdf;
cleanDoc = cleanDoc.replace(/=== PAGE \d+ ===/g, '');
cleanDoc = cleanDoc.replace(/^\d+\s*\/\s*\d+$/gm, '');
cleanDoc = cleanDoc.replace(/^ITE302c\s*-\s*CHUẨN\s*NHUNG\s*HOÀNG$/gm, '');
cleanDoc = cleanDoc.replace(/^Study\s*online\s*at\s*https:\/\/quizlet\.com\/.*$/gm, '');
cleanDoc = cleanDoc.replace(/(\b[a-zA-Z]+)-\s*\n\s*([a-zA-Z]+\b)/g, '$1$2');

const blocks = cleanDoc.split(/\n(?=\d+\.\s+)/);
const pdfMap = new Map();

for (let block of blocks) {
  block = block.trim();
  if (!block) continue;
  const m = block.match(/^(\d+)\.\s*/);
  if (!m) continue;
  const id = parseInt(m[1], 10);

  let rest = block.substring(m[0].length).trim();
  let answerKey = "";

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

    if (/^[A-E]{1,4}(\s*[\(\`].*)?$/i.test(line)) {
      const keyCand = line.match(/^[A-E]{1,4}/i)[0].toUpperCase();
      if (!answerKey || options.length >= 2) {
        answerKey = keyCand;
      }
      continue;
    }

    const optMatch = line.match(/^(?:-\s*)?([A-Ea-e])\s*[\.\:\)]\s+(.*)/);
    if (optMatch) {
      const key = optMatch[1].toUpperCase();
      let text = optMatch[2].trim();

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
      questionText += line + ' ';
    } else if (options.length > 0) {
      options[options.length - 1].text += ' ' + line;
    }
  }

  questionText = questionText.trim();
  questionText = questionText.replace(/^([A-E]{1,4})\s+(?=[A-Z0-9\(\"\'\?])/, '').trim();
  questionText = questionText.replace(/powAB\s*erful/g, 'powerful');
  questionText = questionText.replace(/\b([A-Z][a-z]+)AB\s*([a-z]+)\b/g, '$1$2');
  questionText = questionText.replace(/^(?:NHUNG HOÀNG|\(NHUNG HOÀNG\))\s*/g, '');
  questionText = questionText.replace(/\(NHUNG HOÀNG\)/g, '').trim();

  for (let opt of options) {
    opt.text = opt.text.replace(/\s+[A-E]{1,4}$/, '').trim();
    opt.text = opt.text.replace(/NHUNG HOÀNG|\(NHUNG HOÀNG\)/g, '').trim();
  }

  pdfMap.set(id, {
    id,
    question: questionText,
    options,
    rawAnswer: answerKey || 'A'
  });
}

// Print detailed list of key fixes in ITE302c
console.log('=== LIST OF ALL UPDATED / FIXED ITE302C QUESTIONS ===');

const keyFixes = [
  { id: 69, oldAns: 'A', newAns: 'D', note: 'Lệch đáp án do ngắt trang PDF' },
  { id: 145, oldAns: 'A', newAns: 'AB', note: 'Thiếu đáp án thứ 2 (Select two)' },
  { id: 148, oldAns: 'A', newAns: 'AB', note: 'Thiếu đáp án thứ 2 (Select two) + Lỗi dính powAB erful' },
  { id: 164, oldAns: 'A', newAns: 'BC', note: 'Thiếu đáp án thứ 2 (Select two)' },
  { id: 252, oldAns: 'A', newAns: 'A', note: 'Xóa chữ cái "A " dính vào đầu đề bài' },
  { id: 254, oldAns: 'A', newAns: 'D', note: 'Lệch đáp án do ngắt trang PDF' },
  { id: 353, oldAns: 'A', newAns: 'C', note: 'Lệch đáp án do ngắt trang PDF' },
  { id: 357, oldAns: 'A', newAns: 'B', note: 'Sửa lỗi dính "B " ở đầu đề + Đưa đáp án về B chuẩn' },
  { id: 360, oldAns: 'A', newAns: 'B', note: 'Lệch đáp án do ngắt trang PDF' }
];

console.log(JSON.stringify(keyFixes, null, 2));
