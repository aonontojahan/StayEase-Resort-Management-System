import uuid
from datetime import date, timedelta
import pytest
from httpx import AsyncClient
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.repository import RoleRepository, UserRepository

API_PREFIX = "/api/v1"


async def _create_admin(client: AsyncClient, db_session: AsyncSession, suffix: str):
    payload = {
        "email": f"admin.rooms.{suffix}@test.com",
        "password": "AdminPass123!",
        "full_name": "Test Manager",
    }
    resp = await client.post(f"{API_PREFIX}/auth/register", json=payload)
    assert resp.status_code == status.HTTP_201_CREATED
    token = resp.json()["access_token"]
    user_data = resp.json()["user"]

    role_repo = RoleRepository(db_session)
    user_repo = UserRepository(db_session)
    mgr_role = await role_repo.get_by_name("Manager")
    user = await user_repo.get_by_id(uuid.UUID(user_data["id"]))
    user.role_id = mgr_role.id
    user.role = mgr_role
    await db_session.flush()
    return token


async def _create_guest(client: AsyncClient, suffix: str):
    payload = {
        "email": f"guest.rooms.{suffix}@test.com",
        "password": "GuestPass123!",
        "full_name": "Test Guest",
    }
    resp = await client.post(f"{API_PREFIX}/auth/register", json=payload)
    assert resp.status_code == status.HTTP_201_CREATED
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_list_room_types(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token = await _create_admin(client, db_session, suffix)

    await client.post(
        f"{API_PREFIX}/room-types",
        json={
            "name": f"Ocean View {suffix}",
            "description": "Ocean view suite",
            "base_price_per_night": 350.0,
            "max_occupancy": 2,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    guest_token = await _create_guest(client, suffix + "g")
    response = await client.get(
        f"{API_PREFIX}/room-types",
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    assert any(f"Ocean View {suffix}" in rt["name"] for rt in data)


@pytest.mark.asyncio
async def test_create_room_type(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token = await _create_admin(client, db_session, suffix)

    payload = {
        "name": f"Penthouse {suffix}",
        "description": "Luxury penthouse suite",
        "base_price_per_night": 500.0,
        "max_occupancy": 4,
        "amenities": ["WiFi", "Jacuzzi", "Bar"],
    }
    response = await client.post(
        f"{API_PREFIX}/room-types",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == f"Penthouse {suffix}"
    assert data["base_price_per_night"] == 500.0
    assert data["max_occupancy"] == 4
    assert "id" in data


@pytest.mark.asyncio
async def test_list_rooms(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token = await _create_admin(client, db_session, suffix)

    rt_resp = await client.post(
        f"{API_PREFIX}/room-types",
        json={
            "name": f"Suite {suffix}",
            "description": "A suite",
            "base_price_per_night": 200.0,
            "max_occupancy": 2,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    room_type = rt_resp.json()

    await client.post(
        f"{API_PREFIX}/rooms",
        json={
            "room_number": f"{suffix[:2]}01",
            "floor": 2,
            "room_type_id": room_type["id"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    guest_token = await _create_guest(client, suffix + "g")
    response = await client.get(
        f"{API_PREFIX}/rooms",
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    assert any(f"{suffix[:2]}01" in r["room_number"] for r in data)


@pytest.mark.asyncio
async def test_get_room(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token = await _create_admin(client, db_session, suffix)

    rt_resp = await client.post(
        f"{API_PREFIX}/room-types",
        json={
            "name": f"Suite {suffix}",
            "description": "A suite",
            "base_price_per_night": 200.0,
            "max_occupancy": 2,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    room_type = rt_resp.json()

    room_resp = await client.post(
        f"{API_PREFIX}/rooms",
        json={
            "room_number": f"{suffix[:2]}02",
            "floor": 3,
            "room_type_id": room_type["id"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    room = room_resp.json()

    guest_token = await _create_guest(client, suffix + "g")
    response = await client.get(
        f"{API_PREFIX}/rooms/{room['id']}",
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["room_number"] == f"{suffix[:2]}02"
    assert data["floor"] == 3
    assert data["room_type"]["name"] == f"Suite {suffix}"


@pytest.mark.asyncio
async def test_get_available_rooms(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token = await _create_admin(client, db_session, suffix)

    rt_resp = await client.post(
        f"{API_PREFIX}/room-types",
        json={
            "name": f"Suite {suffix}",
            "description": "Suite",
            "base_price_per_night": 200.0,
            "max_occupancy": 2,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    room_type = rt_resp.json()

    await client.post(
        f"{API_PREFIX}/rooms",
        json={
            "room_number": f"{suffix[:2]}03",
            "floor": 1,
            "room_type_id": room_type["id"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    guest_token = await _create_guest(client, suffix + "g")
    today = date.today()
    check_in = today + timedelta(days=10)
    check_out = today + timedelta(days=12)
    response = await client.get(
        f"{API_PREFIX}/rooms/available",
        params={"check_in": check_in.isoformat(), "check_out": check_out.isoformat()},
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    assert any(f"{suffix[:2]}03" in r["room_number"] for r in data)


@pytest.mark.asyncio
async def test_create_room(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token = await _create_admin(client, db_session, suffix)

    rt_resp = await client.post(
        f"{API_PREFIX}/room-types",
        json={
            "name": f"Suite {suffix}",
            "description": "Suite",
            "base_price_per_night": 150.0,
            "max_occupancy": 2,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    room_type = rt_resp.json()

    payload = {
        "room_number": f"{suffix[:2]}10",
        "floor": 5,
        "room_type_id": room_type["id"],
        "notes": "Corner room with view",
    }
    response = await client.post(
        f"{API_PREFIX}/rooms",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["room_number"] == f"{suffix[:2]}10"
    assert data["floor"] == 5
    assert data["status"] == "Available"
    assert data["room_type"]["name"] == f"Suite {suffix}"


@pytest.mark.asyncio
async def test_update_room(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token = await _create_admin(client, db_session, suffix)

    rt_resp = await client.post(
        f"{API_PREFIX}/room-types",
        json={
            "name": f"Suite {suffix}",
            "description": "Suite",
            "base_price_per_night": 150.0,
            "max_occupancy": 2,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    room_type = rt_resp.json()

    room_resp = await client.post(
        f"{API_PREFIX}/rooms",
        json={
            "room_number": f"{suffix[:2]}20",
            "floor": 1,
            "room_type_id": room_type["id"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    room = room_resp.json()

    update_payload = {"notes": "Updated notes", "floor": 4}
    response = await client.put(
        f"{API_PREFIX}/rooms/{room['id']}",
        json=update_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["floor"] == 4
    assert data["notes"] == "Updated notes"


@pytest.mark.asyncio
async def test_delete_room(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token = await _create_admin(client, db_session, suffix)

    rt_resp = await client.post(
        f"{API_PREFIX}/room-types",
        json={
            "name": f"Suite {suffix}",
            "description": "Suite",
            "base_price_per_night": 150.0,
            "max_occupancy": 2,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    room_type = rt_resp.json()

    room_resp = await client.post(
        f"{API_PREFIX}/rooms",
        json={
            "room_number": f"{suffix[:2]}30",
            "floor": 1,
            "room_type_id": room_type["id"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    room = room_resp.json()

    response = await client.delete(
        f"{API_PREFIX}/rooms/{room['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT

    get_resp = await client.get(
        f"{API_PREFIX}/rooms/{room['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert get_resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
async def test_unauthorized_access_returns_401(client: AsyncClient):
    response = await client.get(f"{API_PREFIX}/rooms")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

    response2 = await client.get(f"{API_PREFIX}/room-types")
    assert response2.status_code == status.HTTP_401_UNAUTHORIZED
