import re
import json

with open("pdf_text_pypdf.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Clean up header/footer noise per page
lines = text.splitlines()
cleaned_lines = []

for line in lines:
    l = line.strip()
    if not l:
        continue
    if l.startswith("--- PAGE"):
        continue
    if "MLN122_" in l or "quizlet.com" in l or "Hoc trực tuyến tại" in l:
        continue
    if re.match(r"^\d+\s*/\s*122$", l):
        continue
    cleaned_lines.append(l)

clean_text = "\n".join(cleaned_lines)

# Let's inspect how question starts: regex for \n(?=\d+\.\s+)
items = re.split(r'\n(?=\d+\.\s+)', "\n" + clean_text)

raw_questions = []
for item in items:
    item = item.strip()
    if not item:
        continue
    m = re.match(r'^(\d+)\.\s*(.*)', item, re.DOTALL)
    if m:
        q_num = int(m.group(1))
        q_content = m.group(2).strip()
        raw_questions.append((q_num, q_content))

print(f"Parsed raw questions count: {len(raw_questions)}")

nums = set(q[0] for q in raw_questions)
missing = [n for n in range(1, 497) if n not in nums]
print(f"Missing question numbers count: {len(missing)}")
if missing:
    print(f"Missing numbers: {missing[:20]}")

# Let's inspect duplicate question numbers if any
num_counts = {}
for q in raw_questions:
    num_counts[q[0]] = num_counts.get(q[0], 0) + 1
duplicates = [k for k, v in num_counts.items() if v > 1]
print(f"Duplicates: {duplicates}")

with open("raw_parsed_questions.json", "w", encoding="utf-8") as f:
    json.dump([{"id": q[0], "content": q[1]} for q in raw_questions], f, ensure_ascii=False, indent=2)

print("Saved raw_parsed_questions.json successfully!")
