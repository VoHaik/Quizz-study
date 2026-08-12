import json
import re

with open("raw_prompt.txt", "r", encoding="utf-8", errors="ignore") as f:
    raw_log = f.read()

# Extract the user prompt content from transcript.jsonl
prompt_text = ""
for line in raw_log.splitlines():
    try:
        obj = json.loads(line)
        if obj.get("type") == "USER_INPUT":
            content = obj.get("content", "")
            if isinstance(content, str) and "==Start of PDF==" in content:
                prompt_text = content
                break
    except Exception:
        pass

if not prompt_text:
    # Try finding ==Start of PDF== in raw_log directly
    idx = raw_log.find("==Start of PDF==")
    if idx != -1:
        end_idx = raw_log.find("==End of PDF==", idx)
        prompt_text = raw_log[idx:end_idx] if end_idx != -1 else raw_log[idx:]

print(f"Extracted prompt length: {len(prompt_text)}")

# Save prompt text to prompt_clean.txt
with open("prompt_clean.txt", "w", encoding="utf-8") as f:
    f.write(prompt_text)

# Let's inspect how the text is structured.
# Remove lines with page markers, header lines, screenshot markers, etc.
lines = prompt_text.splitlines()
filtered_lines = []

skip_patterns = [
    r"^==.*==$",
    r"MLN122_\s*cho\s*mẹ\s*m\s*ho",
    r"Hoc\s*trực\s*tuyến\s*tại",
    r"^\d+\s*/\s*122$",
    r"^<USER_REQUEST>",
    r"^</USER_REQUEST>",
    r"^<ADDITIONAL_METADATA>",
    r"^</ADDITIONAL_METADATA>",
    r"^<USER_SETTINGS_CHANGE>",
    r"^</USER_SETTINGS_CHANGE>",
]

for line in lines:
    l_str = line.strip()
    if not l_str:
        continue
    skip = False
    for pat in skip_patterns:
        if re.search(pat, l_str, re.IGNORECASE):
            skip = True
            break
    if not skip:
        filtered_lines.append(l_str)

clean_text = "\n".join(filtered_lines)
with open("clean_text.txt", "w", encoding="utf-8") as f:
    f.write(clean_text)

print(f"Filtered lines: {len(filtered_lines)}, saved to clean_text.txt")
