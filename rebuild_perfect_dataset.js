const fs = require('fs');

const rawPdfText = fs.readFileSync('./pdf_text_pypdf.txt', 'utf8');

// Parse PDF text into 496 questions cleanly
const pages = rawPdfText.split(/--- PAGE \d+ ---/);

let combinedText = "";

for (let page of pages) {
  let lines = page.split('\n');
  let cleanLines = [];
  for (let l of lines) {
    let trimmed = l.trim();
    if (!trimmed) continue;
    if (/^\d+\s*\/\s*122$/.test(trimmed)) continue;
    if (trimmed.includes('MLN122_') || trimmed.includes('quizlet.com') || trimmed.includes('Hoc trực tuyến')) continue;
    cleanLines.push(trimmed);
  }
  combinedText += cleanLines.join('\n') + '\n';
}

// Split into question blocks by \n(?=\d+\.\s+)
const blocks = combinedText.split(/\n(?=\d+\.\s+)/);

const parsedQuestions = [];

for (let block of blocks) {
  block = block.trim();
  if (!block) continue;

  const matchNum = block.match(/^(\d+)\.\s*/);
  if (!matchNum) continue;

  const id = parseInt(matchNum[1], 10);
  let content = block.substring(matchNum[0].length).trim();

  // Extract answer key from right margin / block end if present
  // Patterns like "A", "B", "C", "D", "B (1. ...", "A (W = ...)", "ABC", "AC"
  let answerKey = "";

  // Check if first line has an answer letter right after question number, e.g. "154. B" -> content starts with "B\n" or "B "
  const inlineAnsMatch = content.match(/^([A-E])\s*\n/);
  if (inlineAnsMatch) {
    answerKey = inlineAnsMatch[1];
    content = content.substring(inlineAnsMatch[0].length).trim();
  }

  // Split lines of content
  let lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let questionText = "";
  let options = [];
  let optionKeysSeq = ['A', 'B', 'C', 'D', 'E'];
  let currentOptIdx = 0;
  let inQuestion = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is an answer key line at end or margin (e.g. "A", "B", "C", "D", "B (note...)", "ABC", "AC")
    if (!answerKey && /^[A-Ea-e](\s*[\(\`].*)?$/.test(line) && options.length >= 2) {
      answerKey = line;
      inQuestion = false;
      continue;
    }

    // Check option match
    const optMatch = line.match(/^(?:-\s*)?([A-Ea-e])\s*[\.\:\)]\s+(.*)/);
    if (optMatch) {
      const key = optMatch[1].toUpperCase();
      const text = optMatch[2].trim();
      const expectedKey = optionKeysSeq[currentOptIdx];

      if (key === expectedKey) {
        inQuestion = false;
        options.push({ key, text });
        currentOptIdx++;
        continue;
      }
    }

    // Check trailing answer letter right after options, e.g. standalone "A" or "B" or "C" or "D"
    if (options.length >= 2 && !answerKey && /^[A-E]{1,4}$/.test(line)) {
      answerKey = line;
      inQuestion = false;
      continue;
    }

    if (inQuestion) {
      questionText += line + ' ';
    } else if (options.length > 0) {
      options[options.length - 1].text += ' ' + line;
    }
  }

  questionText = questionText.trim();
  // Strip any orphan leading letter from questionText
  questionText = questionText.replace(/^[A-E]\s+(?=[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ])/g, '');

  if (id && questionText && options.length >= 2) {
    parsedQuestions.push({
      id,
      question: questionText,
      options,
      rawAnswer: answerKey || 'A'
    });
  }
}

// Clean up Vietnamese typos in parsed questions
const typoReplacements = [
  [/tăng trưng/g, 'tăng trưởng'],
  [/tăng trưởn/g, 'tăng trưởng'],
  [/về lưng /g, 'về lượng '],
  [/lực lưng /g, 'lực lượng '],
  [/lưng sản xuất/g, 'lượng sản xuất'],
  [/lưng hao phí/g, 'lượng hao phí'],
  [/lưng giá trị/g, 'lượng giá trị'],
  [/lưng tư bản/g, 'lượng tư bản'],
  [/sản xuấtt/g, 'sản xuất'],
  [/kinh tếế/g, 'kinh tế'],
  [/thếế/g, 'thế'],
  [/Con ngưi/g, 'Con người'],
  [/Con ngưa/g, 'Con người'],
  [/chính tri/g, 'chính trị'],
  [/giá tri/g, 'giá trị'],
  [/sử dung/g, 'sử dụng'],
  [/dich vu/g, 'dịch vụ'],
  [/phuc vu/g, 'phục vụ'],
  [/thi trường/g, 'thị trường'],
  [/đinh hướng/g, 'định hướng'],
  [/muc đích/g, 'mục đích'],
  [/nhiệm vu/g, 'nhiệm vụ'],
  [/khoa hoc/g, 'khoa học'],
  [/quan trong/g, 'quan trọng'],
  [/Trồng trot/g, 'Trồng trọt'],
  [/trồng trot/g, 'trồng trọt'],
  [/Đia tô/g, 'Địa tô'],
  [/đia tô/g, 'địa tô'],
  [/đia chủ/g, 'địa chủ'],
  [/đia vị/g, 'địa vị'],
  [/thẹo/g, 'theo'],
  [/Chon/g, 'Chọn'],
  [/chon/g, 'chọn'],
  [/sup đổ/g, 'sụp đổ'],
  [/bốc lột/g, 'bóc lột'],
  [/côn g nhân/g, 'công nhân'],
  [/g nhân/g, 'công nhân'],
  [/Ăngghẹn/g, 'Ăng-ghen'],
  [/Ăng ghẹn/g, 'Ăng-ghen'],
  [/cất tr\b/g, 'cất trữ'],
  [/thời đi\b/g, 'thời điểm'],
  [/người k\b/g, 'người khác'],
  [/phát triể\b/g, 'phát triển'],
  [/mìn\b/g, 'mình'],
  [/cạnh tran\b/g, 'cạnh tranh'],
  [/gian đôn\b/g, 'giản đơn'],
  [/giản đôn\b/g, 'giản đơn'],
  [/thặng d\b/g, 'thặng dư'],
  [/lợi íc\b/g, 'lợi ích'],
  [/tiền lươn\b/g, 'tiền lương'],
  [/đơn vi\b/g, 'đơn vị'],
  [/lĩnh v\b/g, 'lĩnh vực'],
  [/tư nhâ\b/g, 'tư nhân'],
  [/nhà tư bả\b/g, 'nhà tư bản'],
  [/hàng ho\b/g, 'hàng hóa'],
  [/quố\b/g, 'quốc'],
  [/hiện đạ\b/g, 'hiện đại'],
  [/chiu\b/g, 'chịu'],
  [/phu thuộc\b/g, 'phụ thuộc']
];

for (let q of parsedQuestions) {
  for (let [pat, rep] of typoReplacements) {
    q.question = q.question.replace(pat, rep);
    for (let opt of q.options) {
      opt.text = opt.text.replace(pat, rep);
    }
  }
}

// Convert parsed questions back to pristine markdown format
let outMd = `# NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM KINH TẾ CHÍNH TRỊ MÁC - LÊNIN (MLN122)\n\nDataset được cấu trúc dạng Markdown chuẩn cho Agent/LLM xử lý.\n\n`;

for (let q of parsedQuestions) {
  outMd += `### Câu ${q.id}\n`;
  outMd += `**Câu hỏi:** ${q.question}\n`;
  for (let opt of q.options) {
    outMd += `- ${opt.key}. ${opt.text}\n`;
  }
  outMd += `\n**Đáp án đúng:** \`${q.rawAnswer}\` \n\n`;
}

fs.writeFileSync('./data.md', outMd, 'utf8');
console.log(`Rebuilt Pristine data.md with ${parsedQuestions.length} questions successfully!`);
