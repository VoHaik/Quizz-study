import os

pdf_path = r"C:\Users\KHAI\.gemini\antigravity\brain\77715a1f-bf6d-4b43-ace8-0332e2ac13fa\.user_uploaded\media__1785485989808.pdf"

print("PDF size:", os.path.getsize(pdf_path))

# Try pypdf / pymupdf / pdfplumber / fitz / pdfminer / pypdf2
extracted = False

try:
    import fitz # PyMuPDF
    doc = fitz.open(pdf_path)
    print("PyMuPDF pages:", len(doc))
    full_text = ""
    for i, page in enumerate(doc):
        full_text += f"\n--- PAGE {i+1} ---\n" + page.get_text()
    with open("pdf_text_fitz.txt", "w", encoding="utf-8") as f:
        f.write(full_text)
    print("fitz extracted successfully, len:", len(full_text))
    extracted = True
except Exception as e:
    print("fitz failed:", e)

if not extracted:
    try:
        import pypdf
        reader = pypdf.PdfReader(pdf_path)
        print("pypdf pages:", len(reader.pages))
        full_text = ""
        for i, page in enumerate(reader.pages):
            full_text += f"\n--- PAGE {i+1} ---\n" + (page.extract_text() or "")
        with open("pdf_text_pypdf.txt", "w", encoding="utf-8") as f:
            f.write(full_text)
        print("pypdf extracted successfully, len:", len(full_text))
        extracted = True
    except Exception as e:
        print("pypdf failed:", e)

if not extracted:
    try:
        from pdfminer.high_level import extract_text
        full_text = extract_text(pdf_path)
        with open("pdf_text_miner.txt", "w", encoding="utf-8") as f:
            f.write(full_text)
        print("pdfminer extracted successfully, len:", len(full_text))
        extracted = True
    except Exception as e:
        print("pdfminer failed:", e)
