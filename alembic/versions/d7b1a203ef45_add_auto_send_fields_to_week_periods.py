"""add auto send fields to week_periods

Revision ID: d7b1a203ef45
Revises: c6a992a7e780
Create Date: 2026-06-12 17:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7b1a203ef45'
down_revision: Union[str, None] = 'c6a992a7e780'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 增加 auto_send_delay 列
    op.add_column('week_periods', sa.Column('auto_send_delay', sa.Integer(), nullable=False, server_default='0', comment='截止时间到后延迟自动发送的分钟数'))
    # 增加 auto_sent_at 列
    op.add_column('week_periods', sa.Column('auto_sent_at', sa.DateTime(), nullable=True, comment='自动发送的具体时间'))


def downgrade() -> None:
    op.drop_column('week_periods', 'auto_sent_at')
    op.drop_column('week_periods', 'auto_send_delay')
