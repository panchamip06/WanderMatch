from pydantic import BaseModel
from typing import Optional, Any, Generic, TypeVar

T = TypeVar("T")

class ResponseEnvelope(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
