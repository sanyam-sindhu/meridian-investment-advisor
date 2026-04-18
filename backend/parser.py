import csv
import io

MAX_CHARS = 3000


def _truncate(text: str) -> str:
    if len(text) <= MAX_CHARS:
        return text.strip()
    return text[:MAX_CHARS].strip() + f"\n... [truncated, {len(text)} chars total]"


def parse_txt(data: bytes) -> str:
    return _truncate(data.decode("utf-8", errors="ignore"))


def parse_csv(data: bytes) -> str:
    text = data.decode("utf-8", errors="ignore")
    reader = csv.reader(io.StringIO(text))
    rows = [", ".join(row) for row in reader if any(cell.strip() for cell in row)]
    return _truncate("\n".join(rows))


def parse_pdf(data: bytes) -> str:
    import pdfplumber
    text_parts = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
            for table in page.extract_tables():
                for row in table:
                    cleaned = [cell or "" for cell in row]
                    text_parts.append(", ".join(cleaned))
    return _truncate("\n".join(text_parts))


def parse_xlsx(data: bytes) -> str:
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    rows = []
    for sheet in wb.worksheets:
        rows.append(f"[Sheet: {sheet.title}]")
        for row in sheet.iter_rows(values_only=True):
            if any(cell is not None for cell in row):
                rows.append(", ".join(str(c) if c is not None else "" for c in row))
    return _truncate("\n".join(rows))


def extract_text(filename: str, data: bytes) -> str:
    name = filename.lower()
    try:
        if name.endswith(".pdf"):
            return parse_pdf(data)
        if name.endswith(".csv"):
            return parse_csv(data)
        if name.endswith(".txt"):
            return parse_txt(data)
        if name.endswith((".xlsx", ".xls")):
            return parse_xlsx(data)
    except Exception as e:
        return f"[Could not parse {filename}: {e}]"
    return ""
