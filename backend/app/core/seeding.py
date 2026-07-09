import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.repository import RoleRepository, PermissionRepository
from app.auth.models import Role

logger = logging.getLogger(__name__)

DEFAULT_ROLES = [
    ("Super Admin", "Has full access to all resources and resorts across the system."),
    ("Resort Owner", "Owns and manages resort configurations, billing, and personnel."),
    ("Manager", "Manages operations, rooms, bookings, and housekeeping for a resort."),
    ("Receptionist", "Handles guest check-ins, check-outs, bookings, and guest files."),
    ("Housekeeping", "Views, updates, and completes room cleaning tasks."),
    ("Accountant", "Manages payments, invoices, refunds, and financial reports."),
    ("Guest", "Public user who can view rooms, make bookings, and view invoice history."),
]

DEFAULT_PERMISSIONS = [
    # Bookings
    ("bookings:create", "Create a reservation"),
    ("bookings:read", "Read reservations"),
    ("bookings:write", "Modify or cancel reservations"),
    # Rooms
    ("rooms:read", "View room and room type listings"),
    ("rooms:write", "Create or edit rooms and categories"),
    # Housekeeping
    ("housekeeping:read", "View cleaning tasks"),
    ("housekeeping:write", "Assign and update cleaning tasks"),
    # Payments
    ("payments:read", "View payment details and history"),
    ("payments:write", "Process payments, deposits, and refunds"),
    # Reports
    ("reports:read", "Generate and export system reports"),
    # Management & Settings
    ("settings:read", "Read resort configurations"),
    ("settings:write", "Modify resort configurations and system rules"),
]

# Map roles to their permission list
ROLE_PERMISSION_MAP = {
    "Super Admin": [p[0] for p in DEFAULT_PERMISSIONS],
    "Resort Owner": [p[0] for p in DEFAULT_PERMISSIONS],
    "Manager": [
        "bookings:create", "bookings:read", "bookings:write",
        "rooms:read", "rooms:write",
        "housekeeping:read", "housekeeping:write",
        "payments:read", "payments:write",
        "reports:read", "settings:read"
    ],
    "Receptionist": [
        "bookings:create", "bookings:read", "bookings:write",
        "rooms:read",
        "housekeeping:read",
        "payments:read", "payments:write",
    ],
    "Housekeeping": [
        "rooms:read",
        "housekeeping:read", "housekeeping:write",
    ],
    "Accountant": [
        "payments:read", "payments:write",
        "reports:read",
    ],
    "Guest": [
        "rooms:read",
        "bookings:create", "bookings:read", "bookings:write",
        "payments:read",
    ]
}


async def seed_db(db: AsyncSession):
    """Seed the database with default roles, permissions, and mappings."""
    try:
        role_repo = RoleRepository(db)
        perm_repo = PermissionRepository(db)

        # 1. Create permissions
        created_permissions = {}
        for name, desc in DEFAULT_PERMISSIONS:
            perm = await perm_repo.create_if_not_exists(name, desc)
            created_permissions[name] = perm

        # 2. Create roles and link permissions
        for name, desc in DEFAULT_ROLES:
            role_perm_names = ROLE_PERMISSION_MAP.get(name, [])
            role_perms = [created_permissions[p_name] for p_name in role_perm_names if p_name in created_permissions]

            role = await role_repo.get_by_name(name)
            if not role:
                role = Role(name=name, description=desc, permissions=role_perms)
                db.add(role)
            else:
                role.description = desc
                role.permissions = role_perms
                db.add(role)

        # 3. Create default Resort Owner user if not exists
        from app.auth.models import User
        from app.auth.repository import UserRepository
        from app.core.security import get_password_hash

        owner_email = "aonontojahan@gmail.com"
        owner_role = await role_repo.get_by_name("Resort Owner")
        if owner_role:
            user_repo = UserRepository(db)
            owner_user = await user_repo.get_by_email(owner_email)
            if not owner_user:
                hashed_pw = get_password_hash("aonontojahan")
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
                logger.info(f"Successfully seeded default Resort Owner: {owner_email}")
            else:
                logger.info(f"Default Resort Owner {owner_email} already exists.")

        await db.commit()
        logger.info("Successfully seeded database with roles, permissions, and default admin.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        await db.rollback()
        raise e
