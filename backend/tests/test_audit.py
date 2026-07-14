import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.audit.models import AuditLog
from app.audit.service import AuditService


@pytest.mark.asyncio
async def test_audit_log_created(db_session: AsyncSession):
    audit = AuditService(db_session)
    resource_id = str(uuid.uuid4())

    await audit.log(
        action="booking:cancelled",
        resource_type="Booking",
        resource_id=resource_id,
        details={"reason": "Guest request", "refund_amount": 150.0},
        actor_id=str(uuid.uuid4()),
        actor_email="staff@stayease.com",
        ip_address="192.168.1.1",
    )

    result = await db_session.execute(
        select(AuditLog).where(AuditLog.resource_id == resource_id)
    )
    entry = result.scalar_one_or_none()
    assert entry is not None
    assert entry.action == "booking:cancelled"
    assert entry.resource_type == "Booking"
    assert entry.actor_email == "staff@stayease.com"
    assert entry.ip_address == "192.168.1.1"
    assert "refund_amount" in entry.details
    assert entry.created_at is not None
