from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import require_role
from app.auth.models import User
from app.audit.repository import AuditLogRepository
from app.audit.schemas import AuditLogRead
from app.core.database import get_db
from app.core.pagination import PaginationParams

router = APIRouter(prefix="/audit", tags=["Audit"])

AUDIT_ROLES = ["Resort Owner", "Manager"]


@router.get("/")
async def list_audit_logs(
    pagination: PaginationParams = Depends(),
    _: User = require_role(AUDIT_ROLES),
    db: AsyncSession = Depends(get_db),
):
    repo = AuditLogRepository(db)
    items = await repo.get_all(skip=pagination.skip, limit=pagination.limit)
    total = await repo.count_all()
    return JSONResponse(
        content=jsonable_encoder([AuditLogRead.model_validate(a) for a in items]),
        headers={
            "X-Total-Count": str(total),
            "Access-Control-Expose-Headers": "X-Total-Count",
        },
    )
