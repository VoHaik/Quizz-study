import json
import re

with open("ite302c_data.md", "r", encoding="utf-8") as f:
    text = f.read()

blocks = re.split(r'\n(?=###\s*Câu\s*\d+)', text)
select_two_list = []

for b in blocks:
    m = re.search(r'###\s*Câu\s*(\d+)', b)
    if not m:
        continue
    qid = int(m.group(1))
    
    q_text_m = re.search(r'\*\*Câu hỏi:\*\*\s*([^\n]+)', b)
    q_text = q_text_m.group(1).strip() if q_text_m else ""
    
    ans_m = re.search(r'\*\*Đáp án đúng:\*\*\s*`([^`]+)`', b)
    ans = ans_m.group(1).strip() if ans_m else ""
    
    opts = re.findall(r'-\s*([A-E])\.\s*([^\n]+)', b)
    
    is_select_two = (len(ans) >= 2) or ("select two" in q_text.lower()) or ("select 2" in q_text.lower())
    
    if is_select_two:
        select_two_list.append({
            'id': qid,
            'question': q_text,
            'answer': ans,
            'options': opts
        })

select_two_list.sort(key=lambda x: x['id'])

report_path = r"C:\Users\KHAI\.gemini\antigravity\brain\77715a1f-bf6d-4b43-ace8-0332e2ac13fa\select_two_summary.md"

md_content = f"# TỔNG HỢP TẤT CẢ CÂU HỎI CHỌN 2 ĐÁP ÁN (SELECT TWO / MULTI-SELECT) MÔN ITE302c\n\n"
md_content += f"> [!IMPORTANT]\n> Tổng cộng có **{len(select_two_list)} câu hỏi chọn 2 đáp án** trong ngân hàng 394 câu ITE302c. Dưới đây là toàn bộ danh sách chi tiết kèm đáp án đúng để học thuộc lòng.\n\n---\n\n"

for item in select_two_list:
    ans_letters = list(item['answer'])
    ans_str = ", ".join(ans_letters)
    
    md_content += f"### 📌 Câu {item['id']}: {item['question']}\n"
    md_content += f"**ĐÁP ÁN ĐÚNG:** `{ans_str}`\n\n"
    
    for key, opt_text in item['options']:
        is_corr = key in ans_letters
        mark = " ✔ (ĐÚNG)" if is_corr else ""
        md_content += f"- **{key}.** {opt_text}{mark}\n"
    
    md_content += "\n---\n\n"

with open(report_path, "w", encoding="utf-8") as f:
    f.write(md_content)

print(f"Successfully generated summary for {len(select_two_list)} select-two questions at {report_path}")
