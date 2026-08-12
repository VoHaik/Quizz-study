const fs = require('fs');
const { parseMarkdownToQuestions } = require('./parser.js');

let md = fs.readFileSync('./data.md', 'utf8');

// Fix Q5 specifically in data.md
md = md.replace(/### Câu 5\n\*\*Câu hỏi:\*\*([^\n]+)\n- A\. ([^\n]+)\n- B\. ([^\n]+)\n- C\. ([^\n]+)\n- D\. ([^\n]+)\n\n\*\*Đáp án đúng:\*\* `[A-D]`/,
`### Câu 5
**Câu hỏi:** Khi nghiên cứu tái sản xuất tư bản xã hội thì K. Marx chia nền kinh tế ra làm hai khu vực là
- A. KVI sản xuất hàng công nghiệp; KVII: sản xuất tư liệu tiêu dùng
- B. KVI: sản xuất tư liệu sản xuất; KVII: sản xuất hàng nông nghiệp
- C. KVI: sản xuất tư liệu sản xuất; KVII: sản xuất tư liệu tiêu dùng
- D. KVI: sản xuất máy móc; KVII: sản xuất tư liệu tiêu dùng

**Đáp án đúng:** \`C\``);

fs.writeFileSync('./data.md', md, 'utf8');

const questions = parseMarkdownToQuestions(md);

console.log('Auditing Q1 to Q10 after fixing Q5:');
for (let i = 1; i <= 10; i++) {
  const q = questions.find(item => item.id === i);
  if (q) {
    console.log(`Q${q.id}: ${q.question.substring(0, 50)}... ==> Correct: [${q.correctAnswers.join(', ')}]`);
  }
}
