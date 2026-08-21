const fs = require('fs');

const rawPdf = fs.readFileSync('./ite302c_pdf_text.txt', 'utf8');

// Parse PDF text into 394 questions cleanly
const pages = rawPdf.split(/=== PAGE \d+ ===/);
let combinedText = "";

for (let p of pages) {
  const lines = p.split('\n');
  const valid = [];
  for (let l of lines) {
    const trimmed = l.trim();
    if (!trimmed) continue;
    if (/^\d+\s*\/\s*125$/.test(trimmed)) continue;
    if (trimmed.includes('ITE302c -') || trimmed.includes('quizlet.com') || trimmed.includes('Study online at')) continue;
    valid.push(trimmed);
  }
  combinedText += valid.join('\n') + '\n';
}

// Fix hyphenated words across line breaks (e.g. "pow-" + "erful" -> "powerful")
combinedText = combinedText.replace(/(\b\w+)-\n(\w+\b)/g, '$1$2');

// Split into blocks by question number e.g. \n(?=\d+\.\s+)
const blocks = combinedText.split(/\n(?=\d+\.\s+)/);

const parsedQuestions = [];

for (let block of blocks) {
  block = block.trim();
  if (!block) continue;

  const m = block.match(/^(\d+)\.\s*/);
  if (!m) continue;

  const id = parseInt(m[1], 10);
  let content = block.substring(m[0].length).trim();

  let answerKey = "";

  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let questionText = "";
  let options = [];
  let optionKeysSeq = ['A', 'B', 'C', 'D', 'E'];
  let currentOptIdx = 0;
  let inQuestion = true;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check standalone answer key line at page break or end of card (e.g. "AB", "CD", "BC", "ABC", "ABCD")
    if (/^[A-E]{1,4}(\s*[\(\`].*)?$/i.test(line)) {
      const candidateKey = line.match(/^[A-E]{1,4}/i)[0].toUpperCase();
      // If line is just an answer key letter at page break
      if (!answerKey || options.length >= 2) {
        answerKey = candidateKey;
      }
      continue;
    }

    // Check option match e.g. "A. ...", "B. ..."
    const optMatch = line.match(/^(?:-\s*)?([A-Ea-e])\s*[\.\:\)]\s+(.*)/);
    if (optMatch) {
      const key = optMatch[1].toUpperCase();
      let text = optMatch[2].trim();

      // Check trailing answer key attached at end of option line (e.g. "...right and wrong. AB")
      const trailingAns = text.match(/(.*?)\s+([A-E]{2,4})$/);
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
  questionText = questionText.replace(/powAB\s*erful/g, 'powerful');
  questionText = questionText.replace(/\b([A-Z][a-z]+)AB\s*([a-z]+)\b/g, '$1$2');
  questionText = questionText.replace(/^(?:NHUNG HOÀNG|\(NHUNG HOÀNG\))\s*/g, '');
  questionText = questionText.replace(/\(NHUNG HOÀNG\)/g, '').trim();

  // Clean trailing AB / CD in option text
  for (let opt of options) {
    opt.text = opt.text.replace(/\s+[A-E]{2,4}$/, '').trim();
  }

  if (id && questionText && options.length >= 2) {
    parsedQuestions.push({
      id,
      question: questionText,
      options,
      rawAnswer: answerKey || 'A'
    });
  }
}

// Convert parsed questions back to pristine markdown format
let outMd = `# NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM ITE302c - CHUẨN NHUNG HOÀNG\n\n`;

for (let q of parsedQuestions) {
  outMd += `### Câu ${q.id}\n`;
  outMd += `**Câu hỏi:** ${q.question}\n`;
  for (let opt of q.options) {
    outMd += `- ${opt.key}. ${opt.text}\n`;
  }
  outMd += `\n**Đáp án đúng:** \`${q.rawAnswer}\` \n\n`;
}

fs.writeFileSync('./ite302c_data.md', outMd, 'utf8');
console.log(`Successfully rebuilt pristine ite302c_data.md with ${parsedQuestions.length} questions.`);
