"""add users and auth tokens

Revision ID: b74610ad0f3f
Revises: 14b8702aa44d
Create Date: 2026-09-03 11:15:26.043955

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "b74610ad0f3f"
down_revision: Union[str, Sequence[str], None] = "14b8702aa44d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("password_hash", sa.String(length=200), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    op.create_table(
        "auth_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_auth_tokens_token"), "auth_tokens", ["token"], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_auth_tokens_token"), table_name="auth_tokens")
    op.drop_table("auth_tokens")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_table("users")
