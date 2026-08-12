import re
import json

def parse_ite302c_pdf(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        text = f.read()

    # Clean out page headers and footers
    cleaned_lines = []
    for line in text.split('\n'):
        line_s = line.strip()
        if not line_s:
            continue
        if re.match(r'^=== PAGE \d+ ===$', line_s):
            continue
        if 'ITE302c - CHUẨN NHUNG HOÀNG' in line_s:
            continue
        if 'Study online at https://quizlet.com' in line_s:
            continue
        if re.match(r'^\d+\s*/\s*125$', line_s):
            continue
        cleaned_lines.append(line)

    full_text = '\n'.join(cleaned_lines)

    # Split text into question blocks based on line starting with question number e.g. "1. ", "123. "
    # Regex for question start at beginning of line
    pattern = r'(?:\n|^)(\d{1,3})\.\s+'
    matches = list(re.finditer(pattern, full_text))

    questions = []
    for i in range(len(matches)):
        start_idx = matches[i].start()
        end_idx = matches[i+1].start() if i + 1 < len(matches) else len(full_text)
        
        q_num = int(matches[i].group(1))
        block = full_text[start_idx:end_idx].strip()
        
        # Remove initial number prefix "1. " from block
        block = re.sub(r'^\d{1,3}\.\s+', '', block)

        questions.append((q_num, block))

    print(f"Extracted {len(questions)} raw question blocks.")
    return questions

if __name__ == '__main__':
    raw_qs = parse_ite302c_pdf('ite302c_pdf_text.txt')
    print("First 3 blocks sample:")
    for num, blk in raw_qs[:3]:
        print(f"--- Q{num} ---")
        print(blk)
