const fs = require('fs');

const pdfText = fs.readFileSync('./pdf_text_pypdf.txt', 'utf8');

const idx = pdfText.indexOf('154.');
if (idx !== -1) {
  console.log('PDF text around Q154:');
  console.log(pdfText.substring(idx - 200, idx + 600));
} else {
  console.log('Q154 not found in pdf_text_pypdf.txt');
}
