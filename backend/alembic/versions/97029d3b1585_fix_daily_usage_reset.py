"""fix_daily_usage_reset

Revision ID: 97029d3b1585
Revises: 78d09cf37dfe
Create Date: 2024-12-20 17:36:49.721157

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column


# revision identifiers, used by Alembic.
revision = '97029d3b1585'
down_revision = '78d09cf37dfe'
branch_labels = None
depends_on = None


def upgrade():
    # Создаем таблицу для обновления
    users_table = table('users',
        column('id', sa.Integer),
        column('daily_usage', sa.Integer),
        column('last_usage_date', sa.DateTime)
    )
    
    # Сбрасываем все лимиты у всех пользователей
    # daily_usage = 0, last_usage_date = NULL
    op.execute(
        users_table.update().values(
            daily_usage=0,
            last_usage_date=None
        )
    )


def downgrade():
    # Откат не нужен, так как мы просто сбрасываем счетчики
    pass
