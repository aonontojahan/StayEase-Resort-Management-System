import uuid
from datetime import date, timedelta
import pytest
from httpx import AsyncClient
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.repository import RoleRepository, UserRepository

API_PREFIX = "/api/v1"


async def _setup_room(
    client: AsyncClient, db_session: AsyncSession, suffix: str, room_num: str
):
    """Create admin, room type, room. Return (admin_token, room)."""
    payload = {
        "email": f"admin.hk.{suffix}@test.com",
        "password": "AdminPass123!",
        "full_name": "HK Admin",
    }
    resp = await client.post(f"{API_PREFIX}/auth/register", json=payload)
    token = resp.json()["access_token"]
    user_data = resp.json()["user"]

    role_repo = RoleRepository(db_session)
    user_repo = UserRepository(db_session)
    mgr_role = await role_repo.get_by_name("Manager")
    user = await user_repo.get_by_id(uuid.UUID(user_data["id"]))
    user.role_id = mgr_role.id
    user.role = mgr_role
    await db_session.flush()

    rt_resp = await client.post(
        f"{API_PREFIX}/room-types",
        json={
            "name": f"Suite {suffix}",
            "description": "Suite",
            "base_price_per_night": 200.0,
            "max_occupancy": 2,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    room_type = rt_resp.json()

    room_resp = await client.post(
        f"{API_PREFIX}/rooms",
        json={"room_number": room_num, "floor": 1, "room_type_id": room_type["id"]},
        headers={"Authorization": f"Bearer {token}"},
    )
    return token, room_resp.json()


@pytest.mark.asyncio
async def test_create_housekeeping_task(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token, room = await _setup_room(client, db_session, suffix, f"{suffix[:2]}01")

    payload = {
        "room_id": room["id"],
        "title": f"Deep clean room {suffix[:2]}01",
        "description": "Full deep cleaning including windows",
        "priority": "High",
        "due_date": (date.today() + timedelta(days=1)).isoformat(),
    }
    response = await client.post(
        f"{API_PREFIX}/housekeeping/",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["title"] == f"Deep clean room {suffix[:2]}01"
    assert data["status"] == "Pending"
    assert data["priority"] == "High"
    assert data["room"]["id"] == room["id"]


@pytest.mark.asyncio
async def test_list_housekeeping_tasks(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token, room = await _setup_room(client, db_session, suffix, f"{suffix[:2]}11")

    await client.post(
        f"{API_PREFIX}/housekeeping/",
        json={
            "room_id": room["id"],
            "title": f"Clean {suffix[:2]}11",
            "priority": "Medium",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    response = await client.get(
        f"{API_PREFIX}/housekeeping/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    assert any(f"Clean {suffix[:2]}11" in t["title"] for t in data)


@pytest.mark.asyncio
async def test_update_task_status(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token, room = await _setup_room(client, db_session, suffix, f"{suffix[:2]}21")

    task_resp = await client.post(
        f"{API_PREFIX}/housekeeping/",
        json={
            "room_id": room["id"],
            "title": f"Clean {suffix[:2]}21",
            "priority": "Low",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    task_id = task_resp.json()["id"]

    response = await client.patch(
        f"{API_PREFIX}/housekeeping/{task_id}/status",
        json={"status": "Done"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "Done"
    assert data["completed_at"] is not None


@pytest.mark.asyncio
async def test_delete_task(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token, room = await _setup_room(client, db_session, suffix, f"{suffix[:2]}31")

    task_resp = await client.post(
        f"{API_PREFIX}/housekeeping/",
        json={
            "room_id": room["id"],
            "title": f"Clean {suffix[:2]}31",
            "priority": "Medium",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    task_id = task_resp.json()["id"]

    response = await client.delete(
        f"{API_PREFIX}/housekeeping/{task_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT
