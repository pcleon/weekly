"""add system_prompt to report_templates

Revision ID: c6a992a7e780
Revises: b56a3479cf1d
Create Date: 2026-06-12 11:13:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c6a992a7e780'
down_revision: Union[str, None] = 'b56a3479cf1d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('report_templates', sa.Column('system_prompt', sa.Text(), nullable=True, comment='AI汇总系统设定提示词'))


def downgrade() -> None:
    op.drop_column('report_templates', 'system_prompt')
