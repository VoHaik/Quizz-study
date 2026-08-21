const fs = require('fs');

let md = fs.readFileSync('./ite302c_data.md', 'utf8');

// Fix Q220 specifically
md = md.replace(
  /### Câu 220\n\*\*Câu hỏi:\*\* Which of the following describes the goal of integrity when it comes to cybersecurity\?\s+A\s+Ensuring that data hasn't been modified without authorization\.\n- B\. Ensuring that data is not changed\n- C\. Ensuring that data is accessible to those who need it\.\n- D\. Ensuring that data is kept private\.\n\n\*\*Đáp án đúng:\*\* `[A-D]`/,
  `### Câu 220
**Câu hỏi:** Which of the following describes the goal of integrity when it comes to cybersecurity?
- A. Ensuring that data hasn't been modified without authorization.
- B. Ensuring that data is not changed
- C. Ensuring that data is accessible to those who need it.
- D. Ensuring that data is kept private.

**Đáp án đúng:** \`A\``
);

// Fix Q363 specifically
md = md.replace(
  /### Câu 363\n\*\*Câu hỏi:\*\* Identify the privacy risks associated with data collection, transmission, storage, and access in ambient intelligence systems\. Which risk is most prevalent due to constant data monitoring\?\s+A\s+Unauthorized data access\n- B\. Enhanced data analytics\n- C\. Improved user experience\n- D\. Optimized resource allocation\n\n\*\*Đáp án đúng:\*\* `[A-D]`/,
  `### Câu 363
**Câu hỏi:** Identify the privacy risks associated with data collection, transmission, storage, and access in ambient intelligence systems. Which risk is most prevalent due to constant data monitoring?
- A. Unauthorized data access
- B. Enhanced data analytics
- C. Improved user experience
- D. Optimized resource allocation

**Đáp án đúng:** \`A\``
);

fs.writeFileSync('./ite302c_data.md', md, 'utf8');
console.log('Successfully fixed Q220 and Q363 in ite302c_data.md!');
