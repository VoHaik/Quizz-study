const fs = require('fs');

const pdfText = fs.readFileSync('./ite302c_pdf_text.txt', 'utf8');

const idx145 = pdfText.indexOf('145.');
if (idx145 !== -1) {
  console.log('=== ITE302C RAW PDF Q145 ===');
  console.log(pdfText.substring(idx145 - 100, idx145 + 500));
}

const idx148 = pdfText.indexOf('148.');
if (idx148 !== -1) {
  console.log('\n=== ITE302C RAW PDF Q148 ===');
  console.log(pdfText.substring(idx148 - 100, idx148 + 500));
}
