"""order status to string, add sa role support

Revision ID: 8f7638add4c8
Revises: b74610ad0f3f
Create Date: 2026-09-04 08:29:57.750427

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision: str = '8f7638add4c8'
down_revision: Union[str, Sequence[str], None] = 'b74610ad0f3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('repair_orders') as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=sa.VARCHAR(length=6),
            type_=sa.String(length=20),
            existing_nullable=False,
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('repair_orders') as batch_op:
        batch_op.alter_column(
            'status',
            existing_type=sa.String(length=20),
            type_=sa.VARCHAR(length=6),
            existing_nullable=False,
        )
