const fs = require('fs');

function extractCorrectAnswers(rawAnswer) {
  if (!rawAnswer) return ['A'];
  
  const trimmed = rawAnswer.trim();

  // If there's a parenthesis, only take the uppercase letters BEFORE the parenthesis, e.g., "B(1. ...", "A (Gia nhập..."
  const parenIdx = trimmed.indexOf('(');
  let answerPart = parenIdx !== -1 ? trimmed.substring(0, parenIdx).trim() : trimmed;

  // Extract only uppercase letters A-E from answerPart
  const letters = answerPart.match(/[A-E]/g);
  if (letters && letters.length > 0) {
    return Array.from(new Set(letters));
  }

  // Fallback if lowercase letters without parenthesis
  const anyLetters = answerPart.match(/[A-Ea-e]/g);
  if (anyLetters && anyLetters.length > 0) {
    return Array.from(new Set(anyLetters.map(l => l.toUpperCase())));
  }

  return ['A'];
}

// Test against all raw answers from data.md
const md = fs.readFileSync('./data.md', 'utf8');

const rawAnswerLines = [];
for (let line of md.splitlines ? md.splitlines() : md.split('\n')) {
  if (line.includes('**Đáp án đúng:**') || line.match(/^[A-E]\s*\(/) || line.match(/^`?[A-E]{1,4}`?$/)) {
    rawAnswerLines.push(line.trim());
  }
}

console.log('Sample extractions:');
const testCases = [
  "B(1. Tích tu và tập trung tư",
  "ABC",
  "AC",
  "A (W = c + v + mc =",
  "D (Giải thích: Đối tượng",
  "A (đề chưa rõ, nếu \"chủ\"",
  "BDE",
  "A",
  "`C`"
];

for (let tc of testCases) {
  console.log(`"${tc}"  ====>  [${extractCorrectAnswers(tc).join(', ')}]`);
}
