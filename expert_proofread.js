const fs = require('fs');

let md = fs.readFileSync('./data.md', 'utf8');

const proofreadReplacements = [
  // Specific truncated OCR patterns requested by user and found in dataset
  [/cất tr\b/g, 'cất trữ'],
  [/thời đi\b/g, 'thời điểm'],
  [/người k\b/g, 'người khác'],
  [/phát triể\b/g, 'phát triển'],
  [/mìn\b/g, 'mình'],
  [/cạnh tran\b/g, 'cạnh tranh'],
  [/gian đôn\b/g, 'giản đơn'],
  [/giản đôn\b/g, 'giản đơn'],
  [/thặng d\b/g, 'thặng dư'],
  [/sản xuấ\b/g, 'sản xuất'],
  [/sản x\b/g, 'sản xuất'],
  [/kinh t\b/g, 'kinh tế'],
  [/nền kinh t\b/g, 'nền kinh tế'],
  [/nguồn lự\b/g, 'nguồn lực'],
  [/lợi íc\b/g, 'lợi ích'],
  [/tiền lươn\b/g, 'tiền lương'],
  [/đơn vi\b/g, 'đơn vị'],
  [/đơn vi  /g, 'đơn vị '],
  [/lĩnh v\b/g, 'lĩnh vực'],
  [/tư nhâ\b/g, 'tư nhân'],
  [/nhà tư bả\b/g, 'nhà tư bản'],
  [/hàng ho\b/g, 'hàng hóa'],
  [/quố\b/g, 'quốc'],
  [/hiện đạ\b/g, 'hiện đại'],
  [/chiu\b/g, 'chịu'],
  [/phu thuộc\b/g, 'phụ thuộc'],
  [/phu  thuộc\b/g, 'phụ thuộc'],
  [/dich vu\b/g, 'dịch vụ'],
  [/di  ch vu\b/g, 'dịch vụ'],
  [/phuc vu\b/g, 'phục vụ'],
  [/thi trường\b/g, 'thị trường'],
  [/thi  trường\b/g, 'thị trường'],
  [/thì trường\b/g, 'thị trường'],
  [/dinh hướng\b/g, 'định hướng'],
  [/đinh hướng\b/g, 'định hướng'],
  [/muc đích\b/g, 'mục đích'],
  [/khoa hoc\b/g, 'khoa học'],
  [/quan trong\b/g, 'quan trọng'],
  [/nhiệm vu\b/g, 'nhiệm vụ'],
  [/giá tri\b/g, 'giá trị'],
  [/sử dung\b/g, 'sử dụng'],
  [/Trồng trot\b/g, 'Trồng trọt'],
  [/trồng trot\b/g, 'trồng trọt'],
  [/Đia tô\b/g, 'Địa tô'],
  [/đia tô\b/g, 'địa tô'],
  [/đia chủ\b/g, 'địa chủ'],
  [/đia vị\b/g, 'địa vị'],
  [/thẹo\b/g, 'theo'],
  [/Chon\b/g, 'Chọn'],
  [/chon\b/g, 'chọn'],
  [/sup đổ\b/g, 'sụp đổ'],
  [/bốc lột\b/g, 'bóc lột'],
  [/côn g nhân\b/g, 'công nhân'],
  [/g nhân\b/g, 'công nhân'],
  [/Ăngghẹn\b/g, 'Ăng-ghen'],
  [/Ăng ghẹn\b/g, 'Ăng-ghen'],

  // Truncated option tails in dataset
  [/nhằm thu lợi nhuận độc quyền ca\b/g, 'nhằm thu lợi nhuận độc quyền cao'],
  [/giá trị độc quyền ca\b/g, 'giá trị độc quyền cao'],
  [/giá trị thặng dư ca\b/g, 'giá trị thặng dư cao'],
  [/n bằng tiền của giá tr\b/g, 'n bằng tiền của giá trị'],
  [/biểu hiệ n bằng/g, 'biểu hiện bằng'],
  [/biểu hiệ\n/g, 'biểu hiện\n'],
  [/giá tr\b/g, 'giá trị'],
  [/khai thác tài nguyên thiên nhiê\b/g, 'khai thác tài nguyên thiên nhiên'],
  [/trực tiếp để tạo ra giá trị thặng d\b/g, 'trực tiếp để tạo ra giá trị thặng dư'],
  [/tư bản lưu động cần thiết để tiến hành sản x\b/g, 'tư bản lưu động cần thiết để tiến hành sản xuất'],
  [/nghiệp hố\b/g, 'nghiệp hóa'],
  [/cơ khí hố\b/g, 'cơ khí hóa'],
  [/tự động hố\b/g, 'tự động hóa'],
  [/hiện đại hố\b/g, 'hiện đại hóa'],
  [/chủ nghĩ\b/g, 'chủ nghĩa'],
  [/đan xẹ\b/g, 'đan xen'],
  [/đan x\b/g, 'đan xen']
];

for (let [pat, rep] of proofreadReplacements) {
  md = md.replace(pat, rep);
}

fs.writeFileSync('./data.md', md, 'utf8');
console.log('Proofread and updated data.md successfully!');
