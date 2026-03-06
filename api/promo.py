import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.config import get_settings

async def promote():
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        await session.execute(text("UPDATE users SET role = 'superadmin' WHERE email IN ('resper@ness.com.br', 'resper@bekaa.eu');"))
        await session.commit()
        print("Role promoted to superadmin successfully.")

asyncio.run(promote())
