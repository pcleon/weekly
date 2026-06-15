"""add alias to members

Revision ID: f1a2b3c4d5e6
Revises: b56a3479cf1d
Create Date: 2026-06-15 13:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'd7b1a203ef45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add alias column to members table
    op.add_column('members', sa.Column('alias', sa.String(length=100), server_default='', nullable=False))


def downgrade() -> None:
    # Remove alias column from members table
    op.drop_column('members', 'alias')
