const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

const md = fs.readFileSync('./ite302c_data.md', 'utf8');
const questions = parseMarkdownToQuestions(md);

const q360 = questions.find(q => q.id === 360);

console.log('Original Q360:');
console.log(JSON.stringify(q360, null, 2));

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getQuestionWithOptionsShuffled(q) {
  const optsWithOrigKey = q.options.map(o => ({
    originalKey: o.key,
    text: o.text
  }));

  const shuffledOpts = shuffleArray(optsWithOrigKey);

  const keys = ['A', 'B', 'C', 'D', 'E'];
  const newCorrectAnswers = [];

  const newOptions = shuffledOpts.map((opt, idx) => {
    const newKey = keys[idx];
    if (q.correctAnswers.includes(opt.originalKey)) {
      newCorrectAnswers.push(newKey);
    }
    return {
      key: newKey,
      text: opt.text
    };
  });

  return {
    ...q,
    options: newOptions,
    correctAnswers: newCorrectAnswers
  };
}

console.log('\nShuffled Q360 (Run 1):');
const shuffled1 = getQuestionWithOptionsShuffled(q360);
console.log(JSON.stringify(shuffled1, null, 2));

// Verify that the text of correct answer in shuffled1 matches the original correct answer text
const origCorrectText = q360.options.filter(o => q360.correctAnswers.includes(o.key)).map(o => o.text);
const shuffledCorrectText = shuffled1.options.filter(o => shuffled1.correctAnswers.includes(o.key)).map(o => o.text);

console.log('\nOriginal Correct Text:', origCorrectText);
console.log('Shuffled Correct Text:', shuffledCorrectText);

if (JSON.stringify(origCorrectText) === JSON.stringify(shuffledCorrectText)) {
  console.log('✔ PERFECT MATCH! SHUFFLE MAPS CORRECT ANSWERS 100% ACCURATELY!');
} else {
  console.log('❌ MISMATCH IN SHUFFLE!');
}
