const fs = require('fs');

let md = fs.readFileSync('./ite302c_data.md', 'utf8');

// Fix internal split artifacts inside words
md = md.replace(/generD\s*ate/g, 'generate');
md = md.replace(/inciBC\s*dent/g, 'incident');
md = md.replace(/estiD\s*mate/g, 'estimate');
md = md.replace(/happenC\s*ing/g, 'happening');
md = md.replace(/backB\s*lash/g, 'backlash');

// Explicitly set correct answer keys for the 9 audited questions in ite302c_data.md:
// Q69 -> D (Regression)
// Q145 -> AB (Select two)
// Q148 -> AB (Select two)
// Q164 -> BC (Forensic objectives)
// Q252 -> B (an adversarial algorithm)
// Q254 -> D (predict future movement of stocks...)
// Q353 -> C (By providing a model of belief...)
// Q357 -> B (Through regular assessment, feedback, and adaptation)
// Q360 -> B (Loss of public trust and potential regulatory backlash)

const explicitFixes = [
  { id: 69, ans: 'D' },
  { id: 145, ans: 'AB' },
  { id: 148, ans: 'AB' },
  { id: 164, ans: 'BC' },
  { id: 252, ans: 'B' },
  { id: 254, ans: 'D' },
  { id: 353, ans: 'C' },
  { id: 357, ans: 'B' },
  { id: 360, ans: 'B' }
];

for (let item of explicitFixes) {
  const pattern = new RegExp(`(### Câu ${item.id}\\n[\\s\\S]*?\\*\\*Đáp án đúng:\\*\\* \`)[^\`]+(\`)`);
  md = md.replace(pattern, `$1${item.ans}$2`);
}

fs.writeFileSync('./ite302c_data.md', md, 'utf8');
console.log('Successfully cleaned option word splits and set exact answer keys for ITE302c!');
