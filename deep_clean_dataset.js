const fs = require('fs');

let md = fs.readFileSync('./data.md', 'utf8');

// 1. Strip orphan answer letters from question headers
// e.g. "**Câu hỏi:** B\nỞ Việt Nam..." or "**Câu hỏi:** B Ở Việt Nam..."
md = md.replace(/\*\*Câu hỏi:\*\*\s*([A-E])\s*\n\s*/gi, '**Câu hỏi:** ');
md = md.replace(/\*\*Câu hỏi:\*\*\s*([A-E])\s+(?=[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ])/g, '**Câu hỏi:** ');

// 2. Fix Vietnamese typos across dataset
const typoMap = [
  [/tăng trưng/g, 'tăng trưởng'],
  [/tăng trưởn/g, 'tăng trưởng'],
  [/lưng/g, 'lượng'],
  [/lực lượng sản xuấtt/g, 'lực lượng sản xuất'],
  [/sản xuấtt/g, 'sản xuất'],
  [/kinh tếế/g, 'kinh tế'],
  [/thếế/g, 'thế'],
  [/Con ngưi/g, 'Con người'],
  [/Con ngưa/g, 'Con người'],
  [/chính tri/g, 'chính trị'],
  [/giá tri/g, 'giá trị'],
  [/sử dung/g, 'sử dụng'],
  [/dich vu/g, 'dịch vụ'],
  [/phuc vu/g, 'phục vụ'],
  [/thi trường/g, 'thị trường'],
  [/đinh hướng/g, 'định hướng'],
  [/muc đích/g, 'mục đích'],
  [/nhiệm vu/g, 'nhiệm vụ'],
  [/khoa hoc/g, 'khoa học'],
  [/quan trong/g, 'quan trọng'],
  [/Trồng trot/g, 'Trồng trọt'],
  [/trồng trot/g, 'trồng trọt'],
  [/Đia tô/g, 'Địa tô'],
  [/đia tô/g, 'địa tô'],
  [/đia chủ/g, 'địa chủ'],
  [/đia vị/g, 'địa vị'],
  [/thẹo/g, 'theo'],
  [/Chon/g, 'Chọn'],
  [/chon/g, 'chọn'],
  [/sup đổ/g, 'sụp đổ'],
  [/bốc lột/g, 'bóc lột'],
  [/côn g nhân/g, 'công nhân'],
  [/g nhân/g, 'công nhân'],
  [/Ăngghẹn/g, 'Ăng-ghen'],
  [/Ăng ghẹn/g, 'Ăng-ghen']
];

for (let [pat, rep] of typoMap) {
  md = md.replace(pat, rep);
}

fs.writeFileSync('./data.md', md, 'utf8');
console.log('Deep cleaned dataset data.md successfully!');
