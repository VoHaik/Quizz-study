const fs = require('fs');

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

// Update parser.js implementation with extractCorrectAnswers
const parserCode = `/**
 * MLN122 Markdown Question Parser (High Precision)
 * Parses markdown dataset containing 496 MLN122 multiple choice questions.
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
  const text = mdText.replace(/\\r\\n/g, '\\n');
  const rawBlocks = text.split(/\\n(?=###\\s*Câu\\s*\\d+)/i);
  const questionsMap = new Map();

  for (let rawBlock of rawBlocks) {
    const block = rawBlock.trim();
    if (!block) continue;

    const headerMatch = block.match(/^###\\s*Câu\\s*(\\d+)/i);
    if (!headerMatch) continue;
    const id = parseInt(headerMatch[1], 10);

    const lines = block.split('\\n').filter(l => {
      const trimmed = l.trim();
      if (!trimmed) return false;
      if (/^\\d+\\s*\\/\\s*122$/.test(trimmed)) return false;
      if (/MLN122_/i.test(trimmed)) return false;
      if (/quizlet\\.com/i.test(trimmed)) return false;
      if (/Hoc\\s*trực\\s*tuyến\\s*tại/i.test(trimmed)) return false;
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

      if (line.startsWith('### Câu')) {
        continue;
      }

      if (line.includes('**Câu hỏi:**')) {
        inQuestion = true;
        questionText += line.replace('**Câu hỏi:**', '').trim() + ' ';
        continue;
      }

      if (line.includes('**Đáp án đúng:**')) {
        inQuestion = false;
        const ansMatch = line.match(/\\*\\*Đáp án đúng:\\*\\*\\s*\`?([^\`\\n]+)\`?/i);
        if (ansMatch) {
          rawAnswer = ansMatch[1].trim();
        }
        continue;
      }

      if (!rawAnswer && /^[A-Ea-e](\\s*[\\(\`].*)?$/.test(line) && options.length >= 2) {
        rawAnswer = line;
        inQuestion = false;
        continue;
      }

      const optMatch = line.match(/^(?:-\\s*)?([A-Ea-e])\\s*[\\.\\:\\)]\\s+(.*)/);
      if (optMatch) {
        const key = optMatch[1].toUpperCase();
        const optText = optMatch[2].trim();

        const expectedKey = optionKeysSequence[expectedNextOptionIdx];
        if (key === expectedKey) {
          inQuestion = false;
          options.push({ key, text: optText });
          expectedNextOptionIdx++;
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
    let correctAnswers = extractCorrectAnswers(rawAnswer);

    if (id && questionText && options.length >= 2) {
      if (!questionsMap.has(id) || options.length > questionsMap.get(id).options.length) {
        questionsMap.set(id, {
          id,
          question: questionText,
          options,
          correctAnswers,
          rawAnswer
        });
      }
    }
  }

  const questions = Array.from(questionsMap.values()).sort((a, b) => a.id - b.id);
  return questions;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseMarkdownToQuestions, extractCorrectAnswers };
}
`;

fs.writeFileSync('./parser.js', parserCode, 'utf8');
console.log('Updated parser.js with precision extractCorrectAnswers!');
