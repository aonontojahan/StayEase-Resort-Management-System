"""unique transaction_ref per booking, remove unused CancelledFee enum

Revision ID: dc256d5fa4ae
Revises: 6b48b2a09840
Create Date: 2026-07-15 09:14:17.496433

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "dc256d5fa4ae"
down_revision: Union[str, Sequence[str], None] = "6b48b2a09840"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


old_enum = sa.Enum(
    "Pending",
    "Completed",
    "Refunded",
    "CancelledFee",
    name="paymentstatus",
)
new_enum = sa.Enum(
    "Pending",
    "Completed",
    "Refunded",
    name="paymentstatus",
)


def upgrade() -> None:
    op.create_index(
        "ix_payments_booking_transaction",
        "payments",
        ["booking_id", "transaction_ref"],
        postgresql_where=sa.text("transaction_ref IS NOT NULL"),
        unique=True,
    )

    op.execute("ALTER TABLE payments ALTER COLUMN status TYPE text USING status::text")
    op.execute("DROP TYPE IF EXISTS paymentstatus CASCADE")
    op.execute("CREATE TYPE paymentstatus AS ENUM ('Pending', 'Completed', 'Refunded')")
    op.execute(
        "ALTER TABLE payments ALTER COLUMN status TYPE paymentstatus USING "
        "CASE WHEN status IN ('Pending', 'Completed', 'Refunded') THEN status::paymentstatus "
        "ELSE 'Refunded'::paymentstatus END"
    )


def downgrade() -> None:
    op.drop_index("ix_payments_booking_transaction", table_name="payments")

    op.execute("ALTER TABLE payments ALTER COLUMN status TYPE text USING status::text")
    op.execute("DROP TYPE IF EXISTS paymentstatus CASCADE")
    op.execute(
        "CREATE TYPE paymentstatus AS ENUM ('Pending', 'Completed', 'Refunded', 'CancelledFee')"
    )
    op.execute(
        "ALTER TABLE payments ALTER COLUMN status TYPE paymentstatus USING status::paymentstatus"
    )
