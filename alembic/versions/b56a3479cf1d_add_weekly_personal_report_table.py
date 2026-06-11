"""add weekly_personal_report table

Revision ID: b56a3479cf1d
Revises: ee20a7c68ecb
Create Date: 2026-06-11 22:56:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b56a3479cf1d'
down_revision: Union[str, None] = 'ee20a7c68ecb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'weekly_personal_reports',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('weekly_report_id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=True),
        sa.Column('week_period_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], ),
        sa.ForeignKeyConstraint(['template_id'], ['report_templates.id'], ),
        sa.ForeignKeyConstraint(['week_period_id'], ['week_periods.id'], ),
        sa.ForeignKeyConstraint(['weekly_report_id'], ['weekly_reports.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('weekly_personal_reports')
