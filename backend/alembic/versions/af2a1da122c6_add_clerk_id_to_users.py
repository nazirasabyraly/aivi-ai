"""add clerk_id to users

Revision ID: af2a1da122c6
Revises: 97029d3b1585
Create Date: 2025-07-10 16:45:02.116294

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'af2a1da122c6'
down_revision: Union[str, Sequence[str], None] = '97029d3b1585'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add clerk_id column to users table
    op.add_column('users', sa.Column('clerk_id', sa.String(), nullable=True))
    
    # Add unique index for clerk_id
    op.create_index('ix_users_clerk_id', 'users', ['clerk_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop index and column
    op.drop_index('ix_users_clerk_id', table_name='users')
    op.drop_column('users', 'clerk_id')
