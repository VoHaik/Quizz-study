import os

brain_dir = r"C:\Users\KHAI\.gemini\antigravity\brain\77715a1f-bf6d-4b43-ace8-0332e2ac13fa"

for root, dirs, files in os.walk(brain_dir):
    for f in files:
        path = os.path.join(root, f)
        print(path, os.path.getsize(path))
