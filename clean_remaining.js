const fs = require('fs');

let md = fs.readFileSync('./data.md', 'utf8');

md = md.replace(/tăng trưởngg/g, 'tăng trưởng');
md = md.replace(/kinh tếế/g, 'kinh tế');
md = md.replace(/thếế/g, 'thế');
md = md.replace(/trịị/g, 'trị');
md = md.replace(/dụụ/g, 'dụ');
md = md.replace(/vụụ/g, 'vụ');
md = md.replace(/địnhh/g, 'định');
md = md.replace(/dưư/g, 'dư');

fs.writeFileSync('./data.md', md, 'utf8');
console.log('Cleaned double letters in data.md successfully!');
