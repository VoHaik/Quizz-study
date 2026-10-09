/**
 * Multi-Subject Question Parser (High Precision)
 * Parses Markdown, JSON, and Raw Quizlet Text datasets.
 */

function extractCorrectAnswers(rawAnswer) {
  if (!rawAnswer) return ['A'];
  
  const trimmed = rawAnswer.trim();
  const parenIdx = trimmed.indexOf('(');
  let answerPart = parenIdx !== -1 ? trimmed.substring(0, parenIdx).trim() : trimmed;

  const letters = answerPart.match(/[A-E]/g);
  if (letters && letters.length > 0) {
    return Array.from(new Set(letters));
  }

  const anyLetters = answerPart.match(/[A-Ea-e]/g);
  if (anyLetters && anyLetters.length > 0) {
    return Array.from(new Set(anyLetters.map(l => l.toUpperCase())));
  }

  return ['A'];
}

function parseMarkdownToQuestions(mdText) {
  const text = mdText.replace(/\r\n/g, '\n');
  const rawBlocks = text.split(/\n(?=###\s*Câu\s*\d+|###\s*\d+\.|\n(?:\d+)\.\s+)/i);
  const questionsMap = new Map();

  let autoId = 1;

  for (let rawBlock of rawBlocks) {
    const block = rawBlock.trim();
    if (!block) continue;

    let id = autoId;
    const headerMatch = block.match(/^(?:###\s*Câu\s*(\d+)|###\s*(\d+)[\.\:]|(\d+)[\.\:]\s+)/i);
    if (headerMatch) {
      id = parseInt(headerMatch[1] || headerMatch[2] || headerMatch[3], 10);
    }

    const lines = block.split('\n').filter(l => {
      const trimmed = l.trim();
      if (!trimmed) return false;
      if (/^\d+\s*\/\s*\d+$/.test(trimmed)) return false;
      if (/quizlet\.com/i.test(trimmed)) return false;
      if (/Hoc\s*trực\s*tuyến\s*tại/i.test(trimmed)) return false;
      if (trimmed.startsWith('# ') && !trimmed.startsWith('###')) return false;
      return true;
    });

    let questionText = "";
    let options = [];
    let rawAnswer = "";
    let inQuestion = false;

    const optionKeysSequence = ['A', 'B', 'C', 'D', 'E'];
    let expectedNextOptionIdx = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('### Câu') || line.startsWith('### ')) {
        continue;
      }

      if (line.includes('**Câu hỏi:**')) {
        inQuestion = true;
        questionText += line.replace('**Câu hỏi:**', '').trim() + ' ';
        continue;
      }

      if (line.includes('**Đáp án đúng:**')) {
        inQuestion = false;
        const ansMatch = line.match(/\*\*Đáp án đúng:\*\*\s*`?([^`\n]+)`?/i);
        if (ansMatch) {
          rawAnswer = ansMatch[1].trim();
        }
        continue;
      }

      if (!rawAnswer && /^[A-Ea-e](\s*[\(`].*)?$/.test(line) && options.length >= 2) {
        rawAnswer = line;
        inQuestion = false;
        continue;
      }

      const optMatch = line.match(/^(?:-\s*)?([A-Ea-e])\s*[\.\:\)]\s*(.*)/);
      if (optMatch) {
        const key = optMatch[1].toUpperCase();
        const optText = optMatch[2].trim();

        const expectedKey = optionKeysSequence[expectedNextOptionIdx];
        if (key === expectedKey || options.length < 5) {
          inQuestion = false;
          options.push({ key, text: optText });
          expectedNextOptionIdx = options.length;
          continue;
        }
      }

      if (inQuestion) {
        questionText += line + ' ';
      } else if (options.length > 0) {
        options[options.length - 1].text += ' ' + line;
      } else {
        // If not explicitly marked **Câu hỏi:**, accumulate initial text as question
        questionText += line + ' ';
      }
    }

    questionText = questionText.trim();
    // Clean header number from questionText if present
    questionText = questionText.replace(/^\d+[\.\:]\s*/, '').trim();

    let correctAnswers = extractCorrectAnswers(rawAnswer);

    if (questionText && options.length >= 2) {
      if (!questionsMap.has(id) || options.length > questionsMap.get(id).options.length) {
        questionsMap.set(id, {
          id,
          question: questionText,
          options,
          correctAnswers,
          rawAnswer
        });
        autoId = Math.max(autoId, id + 1);
      }
    }
  }

  const questions = Array.from(questionsMap.values()).sort((a, b) => a.id - b.id);
  return questions;
}

/**
 * Universal Input Parser for JSON, Markdown, and Text formats
 */
function parseInputToQuestions(inputText) {
  if (!inputText || !inputText.trim()) return [];

  const str = inputText.trim();

  // Try parsing JSON first
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const jsonArr = JSON.parse(str);
      if (Array.isArray(jsonArr) && jsonArr.length > 0 && jsonArr[0].question && jsonArr[0].options) {
        return jsonArr.map((q, idx) => ({
          id: q.id || idx + 1,
          type: q.type || (q.correctAnswers && q.correctAnswers.length > 1 ? 'multiple' : 'single'),
          question: q.question,
          options: q.options,
          correctAnswers: q.correctAnswers || ['A'],
          rawAnswer: q.rawAnswer || (q.correctAnswers ? q.correctAnswers.join(',') : 'A'),
          explanation: q.explanation || '',
          imageSource: q.imageSource || ''
        }));
      }
    } catch (e) {
      console.warn("JSON parse failed, falling back to Markdown parser", e);
    }
  }

  return parseMarkdownToQuestions(str);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseInputToQuestions, parseMarkdownToQuestions, extractCorrectAnswers };
}
