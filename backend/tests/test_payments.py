import uuid
from datetime import date, timedelta
import pytest
from httpx import AsyncClient
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.repository import RoleRepository, UserRepository

API_PREFIX = "/api/v1"
FINANCE_ROLES = ["Resort Owner", "Manager", "Accountant", "Receptionist"]


async def _setup_booking(
    client: AsyncClient, db_session: AsyncSession, suffix: str
) -> tuple:
    """Create admin, room type, room, guest, booking. Return (admin_token, guest_token, booking)."""
    admin_payload = {
        "email": f"admin.pay.{suffix}@test.com",
        "password": "AdminPass123!",
        "full_name": "Payment Admin",
    }
    resp = await client.post(f"{API_PREFIX}/auth/register", json=admin_payload)
    admin_token = resp.json()["access_token"]
    admin_user = resp.json()["user"]

    role_repo = RoleRepository(db_session)
    user_repo = UserRepository(db_session)
    mgr_role = await role_repo.get_by_name("Manager")
    admin = await user_repo.get_by_id(uuid.UUID(admin_user["id"]))
    admin.role_id = mgr_role.id
    admin.role = mgr_role
    await db_session.flush()

    rt_resp = await client.post(
        f"{API_PREFIX}/room-types",
        json={
            "name": f"Suite {suffix}",
            "description": "Suite",
            "base_price_per_night": 300.0,
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
        "email": f"guest.pay.{suffix}@test.com",
        "password": "GuestPass123!",
        "full_name": "Payment Guest",
    }
    gresp = await client.post(f"{API_PREFIX}/auth/register", json=guest_payload)
    guest_token = gresp.json()["access_token"]
    guest_user = gresp.json()["user"]

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
    return admin_token, guest_token, booking, room


@pytest.mark.asyncio
async def test_create_payment(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token, _, booking, _ = await _setup_booking(client, db_session, suffix)

    payload = {
        "booking_id": booking["id"],
        "amount": 900.0,
        "payment_method": "Cash",
        "transaction_ref": f"TXN{suffix}",
        "notes": "Full payment in cash",
    }
    response = await client.post(
        f"{API_PREFIX}/payments/",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["payment"]["amount"] == 900.0
    assert data["payment"]["payment_method"] == "Cash"
    assert data["payment"]["status"] == "Completed"
    assert "invoice_id" in data


@pytest.mark.asyncio
async def test_list_payments(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token, _, booking, _ = await _setup_booking(client, db_session, suffix)

    await client.post(
        f"{API_PREFIX}/payments/",
        json={
            "booking_id": booking["id"],
            "amount": 900.0,
            "payment_method": "Cash",
            "transaction_ref": f"TXN{suffix}",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    response = await client.get(
        f"{API_PREFIX}/payments/",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) >= 1
    assert any(p["booking"]["id"] == booking["id"] for p in data)


@pytest.mark.asyncio
async def test_refund_payment(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    admin_token, _, booking, _ = await _setup_booking(client, db_session, suffix)

    pay_resp = await client.post(
        f"{API_PREFIX}/payments/",
        json={
            "booking_id": booking["id"],
            "amount": 900.0,
            "payment_method": "bKash",
            "transaction_ref": f"TXN{suffix}",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    payment_id = pay_resp.json()["payment"]["id"]

    response = await client.patch(
        f"{API_PREFIX}/payments/{payment_id}/refund",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "Refunded"


@pytest.mark.asyncio
async def test_stripe_create_intent(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    _, guest_token, booking, _ = await _setup_booking(client, db_session, suffix)

    response = await client.post(
        f"{API_PREFIX}/payments/stripe/create-intent",
        json={"booking_id": booking["id"]},
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["is_mock"] is True
    assert data["amount"] == 900.0
    assert "client_secret" in data
    assert "payment_intent_id" in data


@pytest.mark.asyncio
async def test_mobile_banking_payment(client: AsyncClient, db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:6]
    _, guest_token, booking, _ = await _setup_booking(client, db_session, suffix)

    payload = {
        "booking_id": booking["id"],
        "amount": 900.0,
        "payment_method": "bKash",
        "transaction_ref": f"BKASH{suffix}",
        "sender_phone": "+8801712345678",
    }
    response = await client.post(
        f"{API_PREFIX}/payments/mobile-banking",
        json=payload,
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["payment"]["amount"] == 900.0
    assert data["payment"]["payment_method"] == "bKash"
    assert data["payment"]["status"] == "Completed"
    assert "invoice_id" in data


@pytest.mark.asyncio
async def test_refund_already_refunded_payment(
    client: AsyncClient, db_session: AsyncSession
):
    suffix = uuid.uuid4().hex[:6]
    admin_token, _, booking, _ = await _setup_booking(client, db_session, suffix)

    pay_resp = await client.post(
        f"{API_PREFIX}/payments/",
        json={
            "booking_id": booking["id"],
            "amount": 900.0,
            "payment_method": "Cash",
            "transaction_ref": f"TXN{suffix}",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    payment_id = pay_resp.json()["payment"]["id"]

    await client.patch(
        f"{API_PREFIX}/payments/{payment_id}/refund",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    response = await client.patch(
        f"{API_PREFIX}/payments/{payment_id}/refund",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "refunded" in response.json()["detail"].lower()
