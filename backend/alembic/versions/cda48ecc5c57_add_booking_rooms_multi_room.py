"""add_booking_rooms_multi_room

Revision ID: cda48ecc5c57
Revises: 2c55db7de8b1
Create Date: 2026-07-13 09:59:02.157424

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "cda48ecc5c57"
down_revision: Union[str, Sequence[str], None] = "2c55db7de8b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Migrate existing booking data into booking_rooms
    conn = op.get_bind()
    result = conn.execute(
        sa.text("""
            SELECT id, room_id, check_in_date, check_out_date, num_guests, special_requests, total_amount, status
            FROM bookings
            WHERE room_id IS NOT NULL
        """)
    )
    rows = result.fetchall()
    if rows:
        for row in rows:
            bid, room_id, check_in, check_out, guests, special_req, total, status = row
            if check_in is None or check_out is None:
                continue
            conn.execute(
                sa.text("""
                    INSERT INTO booking_rooms (id, booking_id, room_id, check_in_date, check_out_date, num_guests, special_requests, room_price_per_night, total_amount, status, created_at, updated_at)
                    VALUES (gen_random_uuid(), :bid, :room_id, :check_in, :check_out, :guests, :special_req, 0, :total, :status, now(), now())
                """),
                {
                    "bid": bid,
                    "room_id": room_id,
                    "check_in": check_in,
                    "check_out": check_out,
                    "guests": guests if guests else 1,
                    "special_req": special_req,
                    "total": total if total else 0,
                    "status": status,
                },
            )

    # Drop old columns from bookings
    try:
        op.drop_constraint(
            op.f("bookings_room_id_fkey"), "bookings", type_="foreignkey"
        )
    except Exception:
        pass
    for col in [
        "room_id",
        "check_in_date",
        "check_out_date",
        "num_guests",
        "special_requests",
    ]:
        try:
            op.drop_column("bookings", col)
        except Exception:
            pass


def downgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column("special_requests", sa.TEXT(), autoincrement=False, nullable=True),
    )
    op.add_column(
        "bookings",
        sa.Column(
            "num_guests",
            sa.INTEGER(),
            autoincrement=False,
            nullable=False,
            server_default="1",
        ),
    )
    op.add_column(
        "bookings",
        sa.Column("check_out_date", sa.DATE(), autoincrement=False, nullable=True),
    )
    op.add_column(
        "bookings",
        sa.Column("check_in_date", sa.DATE(), autoincrement=False, nullable=True),
    )
    op.add_column(
        "bookings", sa.Column("room_id", sa.UUID(), autoincrement=False, nullable=True)
    )
    op.create_foreign_key(
        op.f("bookings_room_id_fkey"),
        "bookings",
        "rooms",
        ["room_id"],
        ["id"],
        ondelete="RESTRICT",
    )
