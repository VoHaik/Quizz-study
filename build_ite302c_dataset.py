import re
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def clean_hyphens_and_noise(text):
    text = re.sub(r'\s*\(\s*NHUNG\s+HOÀNG\s*\)', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*\(\s*073-356-8678\s*\)', '', text)
    text = re.sub(r'\s*\(\s*internal\s*-\s*deisgners\s*external\s*-\s*regulators\s*\)', '', text, flags=re.IGNORECASE)

    # Fix word wrap hyphenation e.g. "com-\nmonly" -> "commonly"
    text = re.sub(r'(\b[a-zA-Z]+)-\s*\n\s*([a-zA-Z]+\b)', r'\1\2', text)
    return text

def parse_single_block(q_num, raw_block):
    block = clean_hyphens_and_noise(raw_block).strip()
    block = re.sub(r'^\d{1,3}\.\s+', '', block)

    lines = [l.strip() for l in block.split('\n') if l.strip()]

    question_parts = []
    options = []
    answer_candidates = []

    opt_regex = re.compile(r'^(?:-\s*)?([A-Ea-e])\s*[\.\:\)]\s*(.*)')

    current_opt = None

    for line in lines:
        m = opt_regex.match(line)
        if m and (current_opt is not None or m.group(1).upper() in ['A', 'B', 'C', 'D', 'E']):
            key = m.group(1).upper()
            opt_text = m.group(2).strip()
            
            if not opt_text and len(options) >= 2:
                answer_candidates.append(key)
                continue

            current_opt = {'key': key, 'text': opt_text}
            options.append(current_opt)
        elif current_opt is not None:
            if re.match(r'^[A-Ea-e]{1,4}$', line) and len(options) >= 2:
                answer_candidates.append(line.upper())
            else:
                current_opt['text'] += ' ' + line
        else:
            if re.match(r'^[A-Ea-e]{1,4}$', line) and len(question_parts) > 0:
                answer_candidates.append(line.upper())
            else:
                question_parts.append(line)

    question_text = ' '.join(question_parts).strip()
    
    for opt in options:
        opt['text'] = re.sub(r'\s+', ' ', opt['text']).strip()

    correct_answers = []
    if answer_candidates:
        raw_ans = answer_candidates[-1]
        for char in raw_ans:
            if any(opt['key'] == char for opt in options):
                if char not in correct_answers:
                    correct_answers.append(char)
    
    if not correct_answers and options:
        correct_answers = [options[0]['key']]

    return {
        'id': q_num,
        'question': question_text,
        'options': options,
        'correctAnswers': correct_answers
    }

def main():
    with open('ite302c_pdf_text.txt', 'r', encoding='utf-8') as f:
        text = f.read()

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

    # Strictly match sequential question numbers 1..394
    matches = []
    for target_num in range(1, 395):
        # Match "\n123. " at start of line
        p = rf'(?:\n|^){target_num}\.\s+'
        m = re.search(p, full_text)
        if m:
            matches.append((target_num, m.start()))

    # Sort matches by position
    matches.sort(key=lambda x: x[1])

    q_map = {}

    for i in range(len(matches)):
        q_num, start_idx = matches[i]
        end_idx = matches[i+1][1] if i + 1 < len(matches) else len(full_text)
        
        block = full_text[start_idx:end_idx].strip()
        parsed_q = parse_single_block(q_num, block)
        if parsed_q['question'] and len(parsed_q['options']) >= 2:
            q_map[q_num] = parsed_q
        else:
            print(f"Warning: Q{q_num} had invalid format. Options count: {len(parsed_q['options'])}")

    final_questions = [q_map[k] for k in sorted(q_map.keys())]

    print(f"Successfully parsed {len(final_questions)} / 394 questions!")

    present_ids = set(q['id'] for q in final_questions)
    missing = [i for i in range(1, 395) if i not in present_ids]
    print('Missing question IDs:', missing)

    # Save to ite302c_data.json
    with open('ite302c_data.json', 'w', encoding='utf-8') as f:
        json.dump(final_questions, f, ensure_ascii=False, indent=2)

    # Save to ite302c_data.md
    md_lines = ["# NGÂN HÀNG CÂU HỎI TRẮC NGHIỆM ITE302c - CHUẨN NHUNG HOÀNG", ""]
    for q in final_questions:
        md_lines.append(f"### Câu {q['id']}")
        md_lines.append(f"**Câu hỏi:** {q['question']}")
        for opt in q['options']:
            md_lines.append(f"- {opt['key']}. {opt['text']}")
        ans_str = ', '.join(q['correctAnswers'])
        md_lines.append(f"**Đáp án đúng:** `{ans_str}`")
        md_lines.append("")

    with open('ite302c_data.md', 'w', encoding='utf-8') as f:
        f.write('\n'.join(md_lines))

    print("Saved ite302c_data.json and ite302c_data.md successfully!")

if __name__ == '__main__':
    main()
