import os
import json

logs_dir = r"C:\Users\KHAI\.gemini\antigravity\brain\77715a1f-bf6d-4b43-ace8-0332e2ac13fa\.system_generated\logs"
full_path = os.path.join(logs_dir, "transcript_full.jsonl")

print("File size of transcript_full.jsonl:", os.path.getsize(full_path))

with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
    for i, line in enumerate(f):
        if "MLN122" in line:
            print(f"Found MLN122 at line {i}, length {len(line)}")
            data = json.loads(line)
            content = data.get("content", "")
            if isinstance(content, str):
                print(f"Content length: {len(content)}")
                with open("prompt_full_raw.txt", "w", encoding="utf-8") as out:
                    out.write(content)
                print("Saved to prompt_full_raw.txt successfully!")
            elif isinstance(content, list):
                print("Content is list, len:", len(content))
                full_c = json.dumps(content, ensure_ascii=False)
                with open("prompt_full_raw.txt", "w", encoding="utf-8") as out:
                    out.write(full_c)
            break
