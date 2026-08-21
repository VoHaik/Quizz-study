const fs = require('fs');

const pdfText = fs.readFileSync('./ite302c_pdf_text.txt', 'utf8');

const idx246 = pdfText.indexOf('246.');
if (idx246 !== -1) {
  console.log('=== RAW PDF AROUND Q246 ===');
  console.log(pdfText.substring(idx246 - 100, idx246 + 400));
} else {
  console.log('Q246 NOT found by "246." in raw PDF text');
}

const idx322 = pdfText.indexOf('322.');
if (idx322 !== -1) {
  console.log('\n=== RAW PDF AROUND Q322 ===');
  console.log(pdfText.substring(idx322 - 100, idx322 + 400));
} else {
  console.log('Q322 NOT found by "322." in raw PDF text');
}
