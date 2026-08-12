import os
import json

transcript_path = r'C:\Users\KHAI\.gemini\antigravity-ide\brain\2ff397fa-fb0e-48af-a7d4-e0897988f4ba\.system_generated\logs\transcript_full.jsonl'

with open(transcript_path, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('==Start of OCR for page 1==')
print('Index:', idx)
if idx != -1:
    end_idx = text.find('==End of OCR for page 125==', idx)
    print('End index:', end_idx)
    raw_ocr = text[idx:end_idx + 30]
    raw_ocr = raw_ocr.replace('\\n', '\n').replace('\\"', '"')
    with open('ite302c_raw_ocr.txt', 'w', encoding='utf-8') as out:
        out.write(raw_ocr)
    print('Saved ite302c_raw_ocr.txt! Length:', len(raw_ocr))
