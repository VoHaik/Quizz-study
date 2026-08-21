const fs = require('fs');

const rawPdf = fs.readFileSync('./ite302c_pdf_text.txt', 'utf8');

const idx = rawPdf.indexOf('246.');
if (idx !== -1) {
  console.log('=== FULL Q246 IN PDF ===');
  console.log(rawPdf.substring(idx, idx + 800));
}
