import uuid
from datetime import date, timedelta
import pytest
from httpx import AsyncClient
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.repository import RoleRepository, UserRepository

API_PREFIX = "/api/v1"


async def _setup_booking(
    client: AsyncClient, db_session: AsyncSession, suffix: str
) -> tuple:
    """Create admin, room type, room, guest, booking. Return (admin_token, guest_token, booking)."""
    admin_payload = {
        "email": f"admin.inv.{suffix}@test.com",
        "password": "AdminPass123!",
        "full_name": "Invoice Admin",
    }
    resp = await client.post(f"{API_PREFIX}/auth/register", json=admin_payload)
    admin_token = resp.json()["access_token"]
    admin_user = resp.json()["user"]

    role_repo = RoleRepository(db_session)
    user_repo = UserRepository(db_session)
    admin_role = await role_repo.get_by_name("Manager")
    admin = await user_repo.get_by_id(uuid.UUID(admin_user["id"]))
    admin.role_id = admin_role.id
    admin.role = admin_role
    await db_session.flush()

    rt_resp = await client.post(
        f"{API_PREFIX}/room-types",
        json={
            "name": f"Suite {suffix}",
            "description": "Suite",
            "base_price_per_night": 250.0,
            "max_occupancy": 2,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    room_type = rt_resp.json()

    room_resp = await client.post(
        f"{API_PREFIX}/rooms",
        json={
            "room_number": f"{suffix[:2]}01",
            "floor": 1,
            "room_type_id": room_type["id"],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    room = room_resp.json()

    guest_payload = {
        "email": f"guest.inv.{suffix}@test.com",
        "password": "GuestPass123!",
        "full_name": "Invoice Guest",
    }
    gresp = await client.post(f"{API_PREFIX}/auth/register", json=guest_payload)
    guest_token = gresp.json()["access_token"]

    today = date.today()
    book_resp = await client.post(
        f"{API_PREFIX}/bookings/",
        json={
            "rooms": [
                {
                    "room_id": room["id"],
                    "check_in_date": (today + timedelta(days=30)).isoformat(),
                    "check_out_date": (today + timedelta(days=33)).isoformat(),
                    "num_guests": 2,
                }
            ]
        },
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    booking = book_resp.json()
    return admin_token, guest_token, booking


@pytest.mark.asyncio
async def test_create_invoice(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token, _, booking = await _setup_booking(client, db_session, suffix)

    payload = {
        "booking_id": booking["id"],
        "due_date": (date.today() + timedelta(days=15)).isoformat(),
        "subtotal": 750.0,
        "tax_rate": 5.0,
        "notes": "Invoice for suite stay",
        "items": [
            {
                "description": "Deluxe Suite x 3 nights",
                "quantity": 3,
                "unit_price": 250.0,
                "amount": 750.0,
            }
        ],
    }
    response = await client.post(
        f"{API_PREFIX}/invoices/",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["subtotal"] == 750.0
    assert data["tax_rate"] == 5.0
    assert data["tax_amount"] == 37.5
    assert data["total_amount"] == 787.5
    assert "INV-" in data["invoice_number"]
    assert len(data["items"]) == 1


@pytest.mark.asyncio
async def test_list_invoices(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token, _, booking = await _setup_booking(client, db_session, suffix)

    await client.post(
        f"{API_PREFIX}/invoices/",
        json={
            "booking_id": booking["id"],
            "due_date": date.today().isoformat(),
            "subtotal": 750.0,
            "items": [
                {
                    "description": "Stay",
                    "quantity": 1,
                    "unit_price": 750.0,
                    "amount": 750.0,
                }
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    response = await client.get(
        f"{API_PREFIX}/invoices/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_get_invoice(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token, guest_token, booking = await _setup_booking(client, db_session, suffix)

    inv_resp = await client.post(
        f"{API_PREFIX}/invoices/",
        json={
            "booking_id": booking["id"],
            "due_date": date.today().isoformat(),
            "subtotal": 750.0,
            "items": [
                {
                    "description": "Stay",
                    "quantity": 1,
                    "unit_price": 750.0,
                    "amount": 750.0,
                }
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    invoice_id = inv_resp.json()["id"]

    response = await client.get(
        f"{API_PREFIX}/invoices/{invoice_id}",
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == invoice_id
    assert data["total_amount"] == 750.0


@pytest.mark.asyncio
async def test_update_invoice_status(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token, _, booking = await _setup_booking(client, db_session, suffix)

    inv_resp = await client.post(
        f"{API_PREFIX}/invoices/",
        json={
            "booking_id": booking["id"],
            "due_date": date.today().isoformat(),
            "subtotal": 750.0,
            "items": [
                {
                    "description": "Stay",
                    "quantity": 1,
                    "unit_price": 750.0,
                    "amount": 750.0,
                }
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    invoice_id = inv_resp.json()["id"]

    response = await client.patch(
        f"{API_PREFIX}/invoices/{invoice_id}/status",
        json={"status": "Paid"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "Paid"


@pytest.mark.asyncio
async def test_get_invoice_html(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token, guest_token, booking = await _setup_booking(client, db_session, suffix)

    inv_resp = await client.post(
        f"{API_PREFIX}/invoices/",
        json={
            "booking_id": booking["id"],
            "due_date": date.today().isoformat(),
            "subtotal": 750.0,
            "items": [
                {
                    "description": "Stay",
                    "quantity": 1,
                    "unit_price": 750.0,
                    "amount": 750.0,
                }
            ],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    invoice_id = inv_resp.json()["id"]

    response = await client.get(
        f"{API_PREFIX}/invoices/{invoice_id}/html",
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert "text/html" in response.headers.get("content-type", "")
    assert "StayEase" in response.text
    assert "INV-" in response.text
