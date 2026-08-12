const fs = require('fs');

let md = fs.readFileSync('./data.md', 'utf8');

// Replace double accented characters like trịị -> trị, dụngg -> dụng, etc.
md = md.replace(/trịị/g, 'trị');
md = md.replace(/giá trịị/g, 'giá trị');
md = md.replace(/dụụ/g, 'dụ');
md = md.replace(/vụụ/g, 'vụ');
md = md.replace(/địnhh/g, 'định');
md = md.replace(/dưư/g, 'dư');
md = md.replace(/trườngg/g, 'trường');

// Regex for any double accented vowel
const doubleAccents = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]{2}/g;
md = md.replace(doubleAccents, (match) => {
  return match[0]; // keep only 1
});

fs.writeFileSync('./data.md', md, 'utf8');
console.log('Stripped double accented character pairs cleanly!');
