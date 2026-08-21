const fs = require('fs');

const rawPdf = fs.readFileSync('./ite302c_pdf_text.txt', 'utf8');

const idx220 = rawPdf.indexOf('220.');
if (idx220 !== -1) {
  console.log('=== RAW PDF Q220 ===');
  console.log(rawPdf.substring(idx220 - 50, idx220 + 400));
}

const idx363 = rawPdf.indexOf('363.');
if (idx363 !== -1) {
  console.log('\n=== RAW PDF Q363 ===');
  console.log(rawPdf.substring(idx363 - 50, idx363 + 400));
}
