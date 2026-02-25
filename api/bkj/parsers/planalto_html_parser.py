import re
try:
    from bs4 import BeautifulSoup
except ImportError:
    pass

def parse_planalto_html(raw_html: str) -> str:
    """
    Cleans up Planalto HTML, removing struck-through (revoked) text
    and extracting only the valid content.
    """
    soup = BeautifulSoup(raw_html, "html.parser")

    # Remove struck-through elements (revoked text)
    for strike in soup.find_all(['strike', 'del', 's']):
        strike.decompose()
        
    # Sometimes Planalto uses <span style="text-decoration: line-through">
    for span in soup.find_all('span'):
        style = span.get('style', '').lower()
        if 'line-through' in style:
            span.decompose()

    # Extract clean text
    text = soup.get_text(separator="\n")
    
    # Clean up whitespace and empty lines
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    text = "\n".join(lines)
    
    # Clean up repeated spaces
    text = re.sub(r' {2,}', ' ', text)
    
    return text
