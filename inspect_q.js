const fs = require('fs');
const md = fs.readFileSync('./data.md', 'utf8');

const blocks = md.split(/\n(?=###\s*Câu\s*\d+)/i);
for (let b of blocks) {
  const m = b.match(/^###\s*Câu\s*(\d+)/i);
  if (m) {
    const id = parseInt(m[1]);
    if ([2, 3, 4, 34, 45, 227, 228].includes(id)) {
      console.log(`=== QUESTION ${id} ===`);
      console.log(b);
    }
  }
}
