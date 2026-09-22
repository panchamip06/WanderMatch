from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.database import get_db
from backend.app.models.ps11 import City, Currency
from pydantic import BaseModel

router = APIRouter(prefix="/api/reference", tags=["Reference Data"])

class CityOut(BaseModel):
    city_id: str
    name: str
    state: Optional[str] = None
    country_code: str
    region: str
    primary_language: str

    class Config:
        from_attributes = True

class CurrencyOut(BaseModel):
    currency_id: str
    iso4217: str
    name: str
    symbol: str

    class Config:
        from_attributes = True

@router.get("/cities", response_model=List[CityOut])
async def list_cities(
    search: Optional[str] = Query(None),
    limit: int = Query(60, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List reference cities from PS-11 system of record."""
    stmt = select(City)
    if search:
        stmt = stmt.where(City.name.ilike(f"%{search}%"))
    stmt = stmt.order_by(City.name.asc()).limit(limit)

    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/currencies", response_model=List[CurrencyOut])
async def list_currencies(db: AsyncSession = Depends(get_db)):
    """List ISO-4217 currencies from PS-11 system of record."""
    stmt = select(Currency).order_by(Currency.iso4217.asc())
    result = await db.execute(stmt)
    return result.scalars().all()
