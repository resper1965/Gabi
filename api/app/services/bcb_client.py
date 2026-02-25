import httpx
import asyncio
import os
import requests
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GabiHubComplianceBot/1.0",
    "Accept": "text/html,application/xhtml+xml,application/json,application/xml",
}

class BCBClient:
    def __init__(self):
        self.timeout = httpx.Timeout(int(os.getenv("TIMEOUT", 30)))
        
    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException))
    )
    async def fetch_async(self, url: str) -> str:
        async with httpx.AsyncClient(headers=HEADERS, timeout=self.timeout) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.text

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException))
    )
    async def fetch_binary_async(self, url: str) -> bytes:
        async with httpx.AsyncClient(headers=HEADERS, timeout=self.timeout, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.content

    def fetch_sync(self, url: str) -> str:
        """Fallback for sync contexts or specific libraries"""
        resp = requests.get(url, headers=HEADERS, timeout=int(os.getenv("TIMEOUT", 30)))
        resp.raise_for_status()
        return resp.text
