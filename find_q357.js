const fs = require('fs');

const rawPdf = fs.readFileSync('./ite302c_pdf_text.txt', 'utf8');

const idx = rawPdf.indexOf('357.');
if (idx !== -1) {
  console.log('=== RAW PDF AROUND Q357 ===');
  console.log(rawPdf.substring(idx - 150, idx + 500));
} else {
  console.log('Q357 not found by "357."');
}
