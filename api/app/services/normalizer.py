import re
import html
import hashlib

def html_to_text(raw_html: str) -> str:
    """Convert HTML to clean text."""
    text = re.sub(r"<style[^>]*>.*?</style>", "", raw_html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</(p|div|h[1-6]|li|tr|dt|dd|blockquote)>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<(p|div|h[1-6]|li|tr|dt|dd|blockquote)[^>]*>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)

    lines = []
    for line in text.split("\n"):
        line = line.strip()
        line = re.sub(r"\s+", " ", line)
        if line:
            lines.append(line)

    result = "\n".join(lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()

def extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract text from a PDF binary using PyMuPDF (fitz)"""
    try:
        import fitz
    except ImportError:
        raise RuntimeError("PyMuPDF (fitz) is not installed. Run 'pip install PyMuPDF'")

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text_blocks = []
    for page in doc:
        text_blocks.append(page.get_text())
    return "\n".join(text_blocks)

def generate_hash(content: str) -> str:
    """Return SHA-256 hash of the content."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()
