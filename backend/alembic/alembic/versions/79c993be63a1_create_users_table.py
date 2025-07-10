from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'saved_songs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('youtube_video_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('artist', sa.String(), nullable=True),
        sa.Column('date_saved', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('media_url', sa.String(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table('chat_messages')
    op.drop_table('saved_songs') 