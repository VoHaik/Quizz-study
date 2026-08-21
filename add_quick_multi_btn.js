const fs = require('fs');

let html = fs.readFileSync('./index.html', 'utf8');

const oldHtml = `<select class="select-range" id="rangeSelect" title="Chọn dải câu hỏi để học">
          <option value="all">Toàn bộ 496 câu</option>
        </select>`;

const newHtml = `<select class="select-range" id="rangeSelect" title="Chọn dải câu hỏi để học">
          <option value="all">Toàn bộ 496 câu</option>
        </select>

        <button class="btn-action btn-primary" id="multiSelectBtn" style="padding: 0.4rem 0.85rem; font-size: 0.85rem; background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 700;" title="Lọc riêng các câu hỏi chọn 2 đáp án để học thuộc nhanh">
          ✌️ Ôn 68 câu chọn 2 đáp án
        </button>`;

html = html.replace(oldHtml, newHtml);
fs.writeFileSync('./index.html', html, 'utf8');

let appJs = fs.readFileSync('./app.js', 'utf8');

const oldAppBtn = `    const applyBtn = document.getElementById('applyCustomRangeBtn');`;
const newAppBtn = `    const multiSelectBtn = document.getElementById('multiSelectBtn');
    if (multiSelectBtn) {
      multiSelectBtn.onclick = () => {
        if (sel) {
          sel.value = 'multi_select';
          if (customBox) customBox.style.display = 'none';
          filterActiveQuestions(true, true);
        }
      };
    }

    const applyBtn = document.getElementById('applyCustomRangeBtn');`;

appJs = appJs.replace(oldAppBtn, newAppBtn);
fs.writeFileSync('./app.js', appJs, 'utf8');

console.log('Successfully added quick multi-select button to index.html and app.js!');
