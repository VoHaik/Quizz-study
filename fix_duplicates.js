const fs = require('fs');

let md = fs.readFileSync('./data.md', 'utf8');

console.log('Scanning for giá trịi, rịi, or double vowel/consonant glitches...');

// Specific fix for double 'i' or duplicate accents caused by previous replacements
md = md.replace(/giá trịi/g, 'giá trị');
md = md.replace(/giá trii/g, 'giá trị');
md = md.replace(/trịi/g, 'trị');
md = md.replace(/trii/g, 'trị');
md = md.replace(/dụụ/g, 'dụ');
md = md.replace(/dụu/g, 'dụ');
md = md.replace(/vụụ/g, 'vụ');
md = md.replace(/vụu/g, 'vụ');
md = md.replace(/dịnhh/g, 'định');
md = md.replace(/địnhh/g, 'định');
md = md.replace(/dinhh/g, 'định');
md = md.replace(/dưư/g, 'dư');
md = md.replace(/dưu/g, 'dư');
md = md.replace(/trườngg/g, 'trường');
md = md.replace(/trườnng/g, 'trường');

// Check any regex like \b\w+([a-zA-Zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ])\1\b if any
fs.writeFileSync('./data.md', md, 'utf8');
console.log('Fixed double-character duplicate typos in data.md!');
