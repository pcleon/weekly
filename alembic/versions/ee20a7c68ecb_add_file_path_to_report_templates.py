"""add file_path to report_templates

Revision ID: ee20a7c68ecb
Revises: eafd8bf70958
Create Date: 2026-06-09 14:22:13.460098

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ee20a7c68ecb'
down_revision: Union[str, None] = 'eafd8bf70958'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('report_templates', sa.Column('file_path', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('report_templates', 'file_path')
