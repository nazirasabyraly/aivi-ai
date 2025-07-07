"""add_google_oauth_fields

Revision ID: 928df475ef07
Revises: add_email_verification
Create Date: 2025-07-07 09:58:01.319099

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '928df475ef07'
down_revision: Union[str, Sequence[str], None] = 'add_email_verification'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add Google OAuth fields
    op.add_column('users', sa.Column('google_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(), nullable=True))
    op.add_column('users', sa.Column('provider', sa.String(), nullable=True, server_default='email'))
    
    # Create index for google_id
    op.create_index('ix_users_google_id', 'users', ['google_id'], unique=True)
    
    # Make hashed_password nullable for Google OAuth users
    op.alter_column('users', 'hashed_password', nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove Google OAuth fields
    op.drop_index('ix_users_google_id', table_name='users')
    op.drop_column('users', 'provider')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'google_id')
    
    # Make hashed_password not nullable again
    op.alter_column('users', 'hashed_password', nullable=False)
