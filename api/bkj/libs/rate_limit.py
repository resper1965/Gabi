import asyncio
import time

class RateLimiter:
    def __init__(self, rps: float):
        self.interval = 1.0 / rps
        self.last_tick = 0.0

    async def wait(self):
        now = time.monotonic()
        elapsed = now - self.last_tick
        if elapsed < self.interval:
            await asyncio.sleep(self.interval - elapsed)
        self.last_tick = time.monotonic()
