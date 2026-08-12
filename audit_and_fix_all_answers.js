const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

let md = fs.readFileSync('./data.md', 'utf8');

// 1. Fix Q5 specifically and any stray answer letters embedded inside option text (e.g. "tư C liệu" -> "tư liệu")
md = md.replace(/sản xuất tư C liệu/g, 'sản xuất tư liệu');
md = md.replace(/sản xuất tư [A-D] liệu/g, 'sản xuất tư liệu');

// 2. Scan all option lines for stray single capital letters A, B, C, D surrounded by spaces inside Vietnamese text
// e.g. " tư C liệu ", " hàng B hóa ", " sản A xuất "
md = md.replace(/(\s+[a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+)\s+[A-D]\s+([a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]+)/g, '$1 $2');

fs.writeFileSync('./data.md', md, 'utf8');

// Parse updated dataset
const questions = parseMarkdownToQuestions(md);

// Verify Q5 specifically
const q5 = questions.find(q => q.id === 5);
console.log('Q5 After Fix:');
console.log(JSON.stringify(q5, null, 2));
