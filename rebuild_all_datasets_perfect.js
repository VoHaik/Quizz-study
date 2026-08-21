const fs = require('fs');

function rebuildIte302cDataset() {
  const rawText = fs.readFileSync('./ite302c_pdf_text.txt', 'utf8');

  // Split into pages
  const pages = rawText.split(/=== PAGE \d+ ===/);
  let cleanedText = "";

  for (let p of pages) {
    const lines = p.split('\n');
    const validLines = [];
    for (let l of lines) {
      const trimmed = l.trim();
      if (!trimmed) continue;
      if (/^\d+\s*\/\s*125$/.test(trimmed)) continue;
      if (trimmed.includes('ITE302c -') || trimmed.includes('quizlet.com') || trimmed.includes('Study online at')) continue;
      validLines.push(trimmed);
    }
    cleanedText += validLines.join('\n') + '\n';
  }

  // Fix hyphenated words across lines (e.g. "pow-" + "erful" -> "powerful")
  cleanedText = cleanedText.replace(/(\b\w+)-\n(\w+\b)/g, '$1$2');

  // Split into blocks by question number e.g. \n(?=\d+\.\s+)
  const blocks = cleanedText.split(/\n(?=\d+\.\s+)/);

  const parsedQuestions = [];

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;

    const numMatch = block.match(/^(\d+)\.\s*/);
    if (!numMatch) continue;

    const id = parseInt(numMatch[1], 10);
    let content = block.substring(numMatch[0].length).trim();

    // Check if inline answer letter exists right after question number, e.g. "145. AB" or "148. AB"
    let answerKey = "";

    const inlineAns = content.match(/^([A-E]{1,4})\s*\n/);
    if (inlineAns) {
      answerKey = inlineAns[1];
      content = content.substring(inlineAns[0].length).trim();
    }

    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let questionText = "";
    let options = [];
    let optionKeysSeq = ['A', 'B', 'C', 'D', 'E'];
    let currentOptIdx = 0;
    let inQuestion = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check standalone answer key line (e.g. "AB", "CD", "BC", "ABC", "A", "B", "C", "D")
      if (!answerKey && /^[A-E]{1,4}(\s*[\(\`].*)?$/i.test(line) && options.length >= 2) {
        answerKey = line.match(/^[A-E]{1,4}/i)[0].toUpperCase();
        inQuestion = false;
        continue;
      }

      // Check option line regex e.g. "A. ...", "B. ..."
      const optMatch = line.match(/^(?:-\s*)?([A-Ea-e])\s*[\.\:\)]\s+(.*)/);
      if (optMatch) {
        const key = optMatch[1].toUpperCase();
        let text = optMatch[2].trim();

        // Strip trailing answer letters attached at end of option line (e.g. "...right and wrong. AB" -> "...right and wrong.")
        const trailingAnsMatch = text.match(/(.*?)\s+([A-E]{2,4})$/);
        if (trailingAnsMatch) {
          text = trailingAnsMatch[1].trim();
          if (!answerKey) answerKey = trailingAnsMatch[2].toUpperCase();
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

    // Clean any orphan answer letters inside questionText (e.g. "powAB erful" -> "powerful")
    questionText = questionText.replace(/powAB\s*erful/g, 'powerful');
    questionText = questionText.replace(/\b([A-Z][a-z]+)AB\s*([a-z]+)\b/g, '$1$2');
    questionText = questionText.replace(/^(?:NHUNG HOÀNG|\(NHUNG HOÀNG\))\s*/g, '');
    questionText = questionText.replace(/\(NHUNG HOÀNG\)/g, '').trim();

    if (id && questionText && options.length >= 2) {
      parsedQuestions.push({
        id,
        question: questionText,
        options,
        rawAnswer: answerKey || 'A'
      });
    }
  }

  // Format as Markdown
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
  console.log(`Rebuilt Pristine ite302c_data.md with ${parsedQuestions.length} questions successfully!`);
}

rebuildIte302cDataset();
