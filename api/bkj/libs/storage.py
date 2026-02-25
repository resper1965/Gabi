import os
import aiofiles

class Storage:
    def __init__(self, base_path: str):
        self.base_path = base_path
        if not os.path.exists(base_path):
            os.makedirs(base_path, exist_ok=True)

    async def save(self, relative_path: str, content: str | bytes) -> str:
        full_path = os.path.join(self.base_path, relative_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        mode = "wb" if isinstance(content, bytes) else "w"
        async with aiofiles.open(full_path, mode) as f:
            await f.write(content)
        return full_path

    def get_full_path(self, relative_path: str) -> str:
        return os.path.join(self.base_path, relative_path)
