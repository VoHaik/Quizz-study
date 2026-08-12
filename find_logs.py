import json
import glob
import os

logs_dir = r"C:\Users\KHAI\.gemini\antigravity\brain\77715a1f-bf6d-4b43-ace8-0332e2ac13fa\.system_generated\logs"
print("Files in logs dir:", os.listdir(logs_dir))

for fname in os.listdir(logs_dir):
    fpath = os.path.join(logs_dir, fname)
    if os.path.isfile(fpath):
        print(f"File {fname} size: {os.path.getsize(fpath)} bytes")
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            if "MLN122" in content:
                print(f"Found MLN122 in {fname}!")
                with open("raw_prompt.txt", "w", encoding="utf-8") as out:
                    out.write(content)
                break
