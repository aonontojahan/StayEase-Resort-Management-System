from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel
from fastapi import Query

T = TypeVar("T")


class PaginationParams:
    def __init__(
        self,
        skip: int = Query(0, ge=0, description="Number of records to skip"),
        limit: int = Query(100, ge=1, le=1000, description="Max records to return"),
    ):
        self.skip = skip
        self.limit = limit


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    skip: int
    limit: int
