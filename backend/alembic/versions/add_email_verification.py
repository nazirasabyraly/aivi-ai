"""Add email verification fields

Revision ID: add_email_verification
Revises: 79c993be63a1
Create Date: 2025-01-31 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_email_verification'
down_revision = '79c993be63a1'
branch_labels = None
depends_on = None


def upgrade():
    # Add email verification fields to users table
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('verification_code', sa.String(), nullable=True))
    op.add_column('users', sa.Column('verification_code_expires', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('preferences', sa.String(), nullable=True))


def downgrade():
    # Remove email verification fields from users table
    op.drop_column('users', 'preferences')
    op.drop_column('users', 'name')
    op.drop_column('users', 'verification_code_expires')
    op.drop_column('users', 'verification_code')
    op.drop_column('users', 'is_verified') 
