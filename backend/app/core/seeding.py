import logging
import os
import secrets
import string
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.repository import RoleRepository, PermissionRepository
from app.auth.models import Role

logger = logging.getLogger(__name__)

DEFAULT_ROLES = [
    ("Resort Owner", "Owns and manages resort configurations, billing, and personnel."),
    ("Manager", "Manages operations, rooms, bookings, and housekeeping for a resort."),
    ("Receptionist", "Handles guest check-ins, check-outs, bookings, and guest files."),
    ("Housekeeping", "Views, updates, and completes room cleaning tasks."),
    ("Accountant", "Manages payments, invoices, refunds, and financial reports."),
    (
        "Guest",
        "Public user who can view rooms, make bookings, and view invoice history.",
    ),
]

DEFAULT_PERMISSIONS = [
    ("bookings:create", "Create a reservation"),
    ("bookings:read", "Read reservations"),
    ("bookings:write", "Modify or cancel reservations"),
    ("rooms:read", "View room and room type listings"),
    ("rooms:write", "Create or edit rooms and categories"),
    ("housekeeping:read", "View cleaning tasks"),
    ("housekeeping:write", "Assign and update cleaning tasks"),
    ("payments:read", "View payment details and history"),
    ("payments:write", "Process payments, deposits, and refunds"),
    ("invoices:read", "View invoices and billing history"),
    ("invoices:write", "Create and manage invoices"),
    ("reports:read", "Generate and export system reports"),
    ("settings:read", "Read resort configurations"),
    ("settings:write", "Modify resort configurations and system rules"),
]

ROLE_PERMISSION_MAP = {
    "Resort Owner": [p[0] for p in DEFAULT_PERMISSIONS],
    "Manager": [
        "bookings:create",
        "bookings:read",
        "bookings:write",
        "rooms:read",
        "rooms:write",
        "housekeeping:read",
        "housekeeping:write",
        "payments:read",
        "payments:write",
        "invoices:read",
        "invoices:write",
        "reports:read",
        "settings:read",
    ],
    "Receptionist": [
        "bookings:create",
        "bookings:read",
        "bookings:write",
        "rooms:read",
        "housekeeping:read",
        "payments:read",
        "payments:write",
        "invoices:read",
    ],
    "Housekeeping": [
        "rooms:read",
        "housekeeping:read",
        "housekeeping:write",
    ],
    "Accountant": [
        "payments:read",
        "payments:write",
        "invoices:read",
        "invoices:write",
        "reports:read",
    ],
    "Guest": [
        "rooms:read",
        "bookings:create",
        "bookings:read",
        "bookings:write",
        "payments:read",
        "invoices:read",
    ],
}


def _generate_password(length: int = 16) -> str:
    chars = string.ascii_letters + string.digits + "!@#$%^&*()"
    return "".join(secrets.choice(chars) for _ in range(length))


async def seed_db(db: AsyncSession):
    try:
        role_repo = RoleRepository(db)
        perm_repo = PermissionRepository(db)

        created_permissions = {}
        for name, desc in DEFAULT_PERMISSIONS:
            perm = await perm_repo.create_if_not_exists(name, desc)
            created_permissions[name] = perm

        for name, desc in DEFAULT_ROLES:
            role_perm_names = ROLE_PERMISSION_MAP.get(name, [])
            role_perms = [
                created_permissions[p_name]
                for p_name in role_perm_names
                if p_name in created_permissions
            ]

            role = await role_repo.get_by_name(name)
            if not role:
                role = Role(name=name, description=desc, permissions=role_perms)
                db.add(role)
            else:
                role.description = desc
                role.permissions = role_perms
                db.add(role)

        from app.auth.models import User
        from app.auth.repository import UserRepository
        from app.core.security import get_password_hash

        owner_email = os.environ.get("OWNER_EMAIL", "admin@stayease.com")
        owner_role = await role_repo.get_by_name("Resort Owner")
        if owner_role:
            user_repo = UserRepository(db)
            owner_user = await user_repo.get_by_email(owner_email)
            if not owner_user:
                seed_password = _generate_password()
                hashed_pw = get_password_hash(seed_password)
                owner_user = User(
                    email=owner_email,
                    hashed_password=hashed_pw,
                    full_name="Resort Owner",
                    phone_number="+8801700000000",
                    role_id=owner_role.id,
                    is_active=True,
                    is_verified=True,
                )
                db.add(owner_user)
                logger.info("=" * 60)
                logger.info(f"DEFAULT RESORT OWNER CREATED:")
                logger.info(f"  Email:    {owner_email}")
                logger.info(f"  Password: {seed_password}")
                logger.info(
                    f"  IMPORTANT: Change this password immediately after first login!"
                )
                logger.info("=" * 60)
            else:
                logger.info(f"Default Resort Owner {owner_email} already exists.")

        await db.commit()
        logger.info(
            "Successfully seeded database with roles, permissions, and default admin."
        )
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        await db.rollback()
        raise e
