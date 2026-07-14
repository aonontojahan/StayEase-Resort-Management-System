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
    """Create admin, room type, and room. Return (admin_token, room)."""
    payload = {
        "email": f"admin.book.{suffix}@test.com",
        "password": "AdminPass123!",
        "full_name": "Booking Admin",
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


async def _create_guest(client: AsyncClient, suffix: str):
    payload = {
        "email": f"guest.book.{suffix}@test.com",
        "password": "GuestPass123!",
        "full_name": "Booking Guest",
    }
    resp = await client.post(f"{API_PREFIX}/auth/register", json=payload)
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_create_booking(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    _, room = await _setup_room(client, db_session, suffix, f"{suffix[:2]}01")
    guest_token = await _create_guest(client, suffix)

    today = date.today()
    payload = {
        "rooms": [
            {
                "room_id": room["id"],
                "check_in_date": (today + timedelta(days=5)).isoformat(),
                "check_out_date": (today + timedelta(days=8)).isoformat(),
                "num_guests": 2,
            }
        ]
    }
    response = await client.post(
        f"{API_PREFIX}/bookings/",
        json=payload,
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["status"] == "Pending"
    assert data["total_amount"] == 600.0
    assert len(data["booking_rooms"]) == 1


@pytest.mark.asyncio
async def test_list_my_bookings(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    _, room = await _setup_room(client, db_session, suffix, f"{suffix[:2]}11")
    guest_token = await _create_guest(client, suffix)

    today = date.today()
    payload = {
        "rooms": [
            {
                "room_id": room["id"],
                "check_in_date": (today + timedelta(days=10)).isoformat(),
                "check_out_date": (today + timedelta(days=12)).isoformat(),
                "num_guests": 1,
            }
        ]
    }
    await client.post(
        f"{API_PREFIX}/bookings/",
        json=payload,
        headers={"Authorization": f"Bearer {guest_token}"},
    )

    response = await client.get(
        f"{API_PREFIX}/bookings/my",
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    assert data[0]["guest"]["email"] == f"guest.book.{suffix}@test.com"


@pytest.mark.asyncio
async def test_get_booking(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    _, room = await _setup_room(client, db_session, suffix, f"{suffix[:2]}21")
    guest_token = await _create_guest(client, suffix)

    today = date.today()
    create_resp = await client.post(
        f"{API_PREFIX}/bookings/",
        json={
            "rooms": [
                {
                    "room_id": room["id"],
                    "check_in_date": (today + timedelta(days=15)).isoformat(),
                    "check_out_date": (today + timedelta(days=18)).isoformat(),
                    "num_guests": 2,
                }
            ]
        },
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    booking_id = create_resp.json()["id"]

    response = await client.get(
        f"{API_PREFIX}/bookings/{booking_id}",
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == booking_id
    assert data["guest"]["email"] == f"guest.book.{suffix}@test.com"


@pytest.mark.asyncio
async def test_update_booking_status(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token, room = await _setup_room(client, db_session, suffix, f"{suffix[:2]}31")
    guest_token = await _create_guest(client, suffix)

    today = date.today()
    create_resp = await client.post(
        f"{API_PREFIX}/bookings/",
        json={
            "rooms": [
                {
                    "room_id": room["id"],
                    "check_in_date": (today + timedelta(days=20)).isoformat(),
                    "check_out_date": (today + timedelta(days=23)).isoformat(),
                    "num_guests": 2,
                }
            ]
        },
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    booking_id = create_resp.json()["id"]

    body = {"status": "Confirmed"}
    response = await client.patch(
        f"{API_PREFIX}/bookings/{booking_id}/status",
        json=body,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "Confirmed"


@pytest.mark.asyncio
async def test_delete_booking(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    _, room = await _setup_room(client, db_session, suffix, f"{suffix[:2]}41")
    guest_token = await _create_guest(client, suffix)

    today = date.today()
    create_resp = await client.post(
        f"{API_PREFIX}/bookings/",
        json={
            "rooms": [
                {
                    "room_id": room["id"],
                    "check_in_date": (today + timedelta(days=25)).isoformat(),
                    "check_out_date": (today + timedelta(days=28)).isoformat(),
                    "num_guests": 1,
                }
            ]
        },
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    booking_id = create_resp.json()["id"]

    cancel_resp = await client.patch(
        f"{API_PREFIX}/bookings/{booking_id}/status",
        json={"status": "Cancelled"},
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert cancel_resp.status_code == status.HTTP_200_OK

    delete_resp = await client.delete(
        f"{API_PREFIX}/bookings/{booking_id}",
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert delete_resp.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.asyncio
async def test_create_booking_conflict(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    _, room = await _setup_room(client, db_session, suffix, f"{suffix[:2]}51")
    guest_token = await _create_guest(client, suffix)

    today = date.today()
    payload = {
        "rooms": [
            {
                "room_id": room["id"],
                "check_in_date": (today + timedelta(days=30)).isoformat(),
                "check_out_date": (today + timedelta(days=33)).isoformat(),
                "num_guests": 2,
            }
        ]
    }
    resp1 = await client.post(
        f"{API_PREFIX}/bookings/",
        json=payload,
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert resp1.status_code == status.HTTP_201_CREATED

    resp2 = await client.post(
        f"{API_PREFIX}/bookings/",
        json=payload,
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert resp2.status_code == status.HTTP_400_BAD_REQUEST
    assert "not available" in resp2.json()["detail"].lower()
