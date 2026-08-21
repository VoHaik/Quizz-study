const fs = require('fs');

const dataMd = fs.readFileSync('./data.md', 'utf8');
const ite302cMd = fs.existsSync('./ite302c_data.md') ? fs.readFileSync('./ite302c_data.md', 'utf8') : '';

console.log('data.md first 300 chars:');
console.log(dataMd.substring(0, 300));

console.log('\nite302c_data.md first 300 chars:');
console.log(ite302cMd.substring(0, 300));

// Check if data.md contains English AI ethics questions
if (dataMd.includes('moral agency') || dataMd.includes('emerging technologies')) {
  console.log('ALERT: data.md HAS ENGLISH AI ETHICS QUESTIONS!');
} else {
  console.log('data.md is Political Economy (MLN122) in Vietnamese.');
}

if (ite302cMd.includes('moral agency') || ite302cMd.includes('emerging technologies')) {
  console.log('ite302c_data.md HAS ENGLISH AI ETHICS QUESTIONS!');
}
