import json

transcript_path = r"C:\Users\KHAI\.gemini\antigravity\brain\77715a1f-bf6d-4b43-ace8-0332e2ac13fa\.system_generated\logs\transcript_full.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        data = json.loads(line)
        tp = data.get("type", "")
        src = data.get("source", "")
        content = str(data.get("content", ""))
        if "MLN122" in content or "Biểu hiện mới" in content:
            print(f"FOUND! type={tp}, src={src}, content_len={len(content)}")
            # Write to raw_prompt.txt
            with open("raw_prompt.txt", "w", encoding="utf-8") as out:
                out.write(content)
            print("Wrote raw_prompt.txt successfully")
            break
