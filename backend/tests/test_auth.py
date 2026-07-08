import pytest
from httpx import AsyncClient
from fastapi import status


@pytest.mark.asyncio
async def test_register_guest_success(client: AsyncClient):
    """Test registering a new guest user is successful and returns authentication tokens."""
    payload = {
        "email": "guest@stayease.com",
        "password": "guestpassword123",
        "full_name": "John Guest",
        "phone_number": "+1234567890"
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "guest@stayease.com"
    assert data["user"]["role"]["name"] == "Guest"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    """Test registering with an already existing email returns 400 Bad Request."""
    payload = {
        "email": "duplicate@stayease.com",
        "password": "password123",
        "full_name": "First User",
    }
    # Register first time
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == status.HTTP_201_CREATED

    # Register second time
    response2 = await client.post("/api/v1/auth/register", json=payload)
    assert response2.status_code == status.HTTP_400_BAD_REQUEST
    assert "already exists" in response2.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """Test logging in with correct credentials."""
    # Register user
    register_payload = {
        "email": "login@stayease.com",
        "password": "mysecurepassword",
        "full_name": "Login Test",
    }
    await client.post("/api/v1/auth/register", json=register_payload)

    # Login
    login_payload = {
        "email": "login@stayease.com",
        "password": "mysecurepassword",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "login@stayease.com"


@pytest.mark.asyncio
async def test_login_failure(client: AsyncClient):
    """Test login fails with incorrect password."""
    # Register user
    register_payload = {
        "email": "fail@stayease.com",
        "password": "correctpassword",
        "full_name": "Fail Test",
    }
    await client.post("/api/v1/auth/register", json=register_payload)

    # Incorrect login
    login_payload = {
        "email": "fail@stayease.com",
        "password": "wrongpassword",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect email or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_current_user_profile(client: AsyncClient):
    """Test getting profile page for an authenticated user."""
    # Register & Auto-login
    payload = {
        "email": "me@stayease.com",
        "password": "password123",
        "full_name": "Me Myself",
    }
    reg_response = await client.post("/api/v1/auth/register", json=payload)
    token = reg_response.json()["access_token"]

    # Access /me without header
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # Access /me with header
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == "me@stayease.com"
    assert data["full_name"] == "Me Myself"


@pytest.mark.asyncio
async def test_token_refresh(client: AsyncClient):
    """Test obtaining a new access token via refresh token."""
    # Register & Auto-login
    payload = {
        "email": "refresh@stayease.com",
        "password": "password123",
        "full_name": "Refresh Test",
    }
    reg_response = await client.post("/api/v1/auth/register", json=payload)
    refresh_token = reg_response.json()["refresh_token"]

    # Refresh token
    refresh_payload = {"refresh_token": refresh_token}
    response = await client.post("/api/v1/auth/refresh", json=refresh_payload)
    assert response.status_code == status.HTTP_200_OK
    
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "refresh@stayease.com"


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient):
    """Test changing user password and logging in with new password."""
    # Register & Auto-login
    payload = {
        "email": "changepassword@stayease.com",
        "password": "oldpassword123",
        "full_name": "Pass Change",
    }
    reg_response = await client.post("/api/v1/auth/register", json=payload)
    access_token = reg_response.json()["access_token"]

    # Change password
    headers = {"Authorization": f"Bearer {access_token}"}
    change_payload = {
        "old_password": "oldpassword123",
        "new_password": "newpassword123"
    }
    response = await client.post("/api/v1/auth/change-password", json=change_payload, headers=headers)
    assert response.status_code == status.HTTP_200_OK

    # Try logging in with old password
    login_old = {"email": "changepassword@stayease.com", "password": "oldpassword123"}
    resp_old = await client.post("/api/v1/auth/login", json=login_old)
    assert resp_old.status_code == status.HTTP_401_UNAUTHORIZED

    # Try logging in with new password
    login_new = {"email": "changepassword@stayease.com", "password": "newpassword123"}
    resp_new = await client.post("/api/v1/auth/login", json=login_new)
    assert resp_new.status_code == status.HTTP_200_OK
