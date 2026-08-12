import json
import re
import os

transcript_path = r"C:\Users\KHAI\.gemini\antigravity\brain\77715a1f-bf6d-4b43-ace8-0332e2ac13fa\.system_generated\logs\transcript_full.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    text_lines = f.readlines()

full_text = ""
for line in text_lines:
    try:
        data = json.loads(line)
        if data.get("type") == "USER_INPUT" or data.get("source") == "USER_EXPLICIT":
            content = data.get("content", "")
            if "==Start of PDF==" in content:
                full_text = content
                break
    except Exception:
        pass

if not full_text:
    print("Could not find PDF text in transcript!")
    # fallback: search all contents
    for line in text_lines:
        if "MLN122_ cho mẹ m ho" in line:
            full_text += line

print(f"Extracted prompt text length: {len(full_text)}")

# Extract text inside PDF markers
pdf_match = re.search(r"==Start of PDF==(.*?)==End of PDF==", full_text, re.DOTALL)
if pdf_match:
    pdf_text = pdf_match.group(1)
else:
    pdf_text = full_text

# Remove screenshot tags and page markers
lines = pdf_text.splitlines()
cleaned_lines = []

for line in lines:
    l = line.strip()
    if not l:
        continue
    if re.match(r"^==.*==$", l):
        continue
    if "MLN122_" in l or "quizlet.com" in l:
        continue
    if re.match(r"^\d+\s*/\s*122$", l):
        continue
    cleaned_lines.append(line)

cleaned_text = "\n".join(cleaned_lines)

with open("cleaned_raw.txt", "w", encoding="utf-8") as f:
    f.write(cleaned_text)

print(f"Cleaned raw text written to cleaned_raw.txt ({len(cleaned_text)} chars)")
