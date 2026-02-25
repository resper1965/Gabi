import hashlib

def calculate_hash(content: str) -> str:
    """Calculates SHA-256 hash of string content."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()
