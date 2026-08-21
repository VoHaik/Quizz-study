const fs = require('fs');

let appJs = fs.readFileSync('./app.js', 'utf8');

// 1. Add multi_select option to populateRangeSelector
const oldPopulate = `    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = '⚙️ Tùy chỉnh (Nhập dải câu...)';
    sel.appendChild(customOpt);`;

const newPopulate = `    const multiSelectCount = allQuestions.filter(q => (q.correctAnswers && q.correctAnswers.length >= 2) || q.question.toLowerCase().includes('select two') || q.question.toLowerCase().includes('select 2')).length;
    if (multiSelectCount > 0) {
      const multiOpt = document.createElement('option');
      multiOpt.value = 'multi_select';
      multiOpt.textContent = \`✌️ Câu hỏi chọn 2 đáp án (\${multiSelectCount} câu)\`;
      sel.appendChild(multiOpt);
    }

    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = '⚙️ Tùy chỉnh (Nhập dải câu...)';
    sel.appendChild(customOpt);`;

appJs = appJs.replace(oldPopulate, newPopulate);

// 2. Handle val === 'multi_select' in filterActiveQuestions
const oldFilter = `} else if (val === 'custom') {`;
const newFilter = `} else if (val === 'multi_select') {
      baseList = allQuestions.filter(q => (q.correctAnswers && q.correctAnswers.length >= 2) || q.question.toLowerCase().includes('select two') || q.question.toLowerCase().includes('select 2'));
    } else if (val === 'custom') {`;

appJs = appJs.replace(oldFilter, newFilter);

fs.writeFileSync('./app.js', appJs, 'utf8');
console.log('Successfully added Multi-Select Filter Option to app.js!');
