const fs = require('fs');

let md = fs.readFileSync('./data.md', 'utf8');

// 1. Fix leading answer letters in question text (e.g. "**Câu hỏi:** B Ở Việt Nam" -> "**Câu hỏi:** Ở Việt Nam")
md = md.replace(/\*\*Câu hỏi:\*\*\s*[A-D]\s+(?=[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ])/g, '**Câu hỏi:** ');

// 2. Fix Vietnamese spelling corruptions caused by previous regexes
const fixes = [
  // Corrupted words fix
  [/về lưng /g, 'về lượng '],
  [/lực lưng /g, 'lực lượng '],
  [/lưng sản xuất/g, 'lượng sản xuất'],
  [/lưng hao phí/g, 'lượng hao phí'],
  [/lưng giá trị/g, 'lượng giá trị'],
  [/lưng tư bản/g, 'lượng tư bản'],
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
  [/Ăng ghẹn/g, 'Ăng-ghen'],

  // Truncated option tails
  [/cất tr\b/g, 'cất trữ'],
  [/thời đi\b/g, 'thời điểm'],
  [/người k\b/g, 'người khác'],
  [/phát triể\b/g, 'phát triển'],
  [/mìn\b/g, 'mình'],
  [/cạnh tran\b/g, 'cạnh tranh'],
  [/gian đôn\b/g, 'giản đơn'],
  [/giản đôn\b/g, 'giản đơn'],
  [/thặng d\b/g, 'thặng dư'],
  [/lợi íc\b/g, 'lợi ích'],
  [/tiền lươn\b/g, 'tiền lương'],
  [/đơn vi\b/g, 'đơn vị'],
  [/lĩnh v\b/g, 'lĩnh vực'],
  [/tư nhâ\b/g, 'tư nhân'],
  [/nhà tư bả\b/g, 'nhà tư bản'],
  [/hàng ho\b/g, 'hàng hóa'],
  [/quố\b/g, 'quốc'],
  [/hiện đạ\b/g, 'hiện đại'],
  [/chiu\b/g, 'chịu'],
  [/phu thuộc\b/g, 'phụ thuộc']
];

for (let [pat, rep] of fixes) {
  md = md.replace(pat, rep);
}

fs.writeFileSync('./data.md', md, 'utf8');
console.log('Rebuilt clean data.md successfully!');
