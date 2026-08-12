import os
import json
import re

transcript_path = r'C:\Users\KHAI\.gemini\antigravity-ide\brain\2ff397fa-fb0e-48af-a7d4-e0897988f4ba\.system_generated\logs\transcript_full.jsonl'

all_ocr_pages = {}

def search_obj(obj):
    if isinstance(obj, str):
        if '==Start of OCR for page' in obj:
            pattern = r'==Start of OCR for page (\d+)==\s*(.*?)\s*==End of OCR for page \1=='
            matches = re.findall(pattern, obj, re.DOTALL)
            for page_num, content in matches:
                all_ocr_pages[int(page_num)] = content
    elif isinstance(obj, dict):
        for v in obj.values():
            search_obj(v)
    elif isinstance(obj, list):
        for item in obj:
            search_obj(item)

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line_num, line in enumerate(f):
        try:
            data = json.loads(line)
            search_obj(data)
        except Exception as e:
            pass

print(f'Extracted {len(all_ocr_pages)} pages!')

sorted_pages = []
for p in sorted(all_ocr_pages.keys()):
    sorted_pages.append(f'=== PAGE {p} ===\n' + all_ocr_pages[p])

full_text = '\n\n'.join(sorted_pages)

with open('ite302c_raw_ocr.txt', 'w', encoding='utf-8') as out:
    out.write(full_text)

print('Saved ite302c_raw_ocr.txt, size:', len(full_text))
