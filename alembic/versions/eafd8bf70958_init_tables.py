"""init tables

Revision ID: eafd8bf70958
Revises: 
Create Date: 2026-06-09 13:30:02.930236

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eafd8bf70958'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'members',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('department', sa.String(100), nullable=False, server_default=''),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        'report_templates',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('is_default', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'week_periods',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('week_start', sa.Date, nullable=False, unique=True),
        sa.Column('week_end', sa.Date, nullable=False),
        sa.Column('deadline', sa.DateTime, nullable=False),
        sa.Column('status', sa.String(20), server_default='open'),
    )

    op.create_table(
        'weekly_reports',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('member_id', sa.Integer, sa.ForeignKey('members.id'), nullable=False),
        sa.Column('template_id', sa.Integer, sa.ForeignKey('report_templates.id'), nullable=True),
        sa.Column('week_period_id', sa.Integer, sa.ForeignKey('week_periods.id'), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('submitted_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        'weekly_summaries',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('week_period_id', sa.Integer, sa.ForeignKey('week_periods.id'), nullable=False),
        sa.Column('summary_content', sa.Text, nullable=False),
        sa.Column('raw_prompt', sa.Text, nullable=True),
        sa.Column('generated_at', sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('weekly_summaries')
    op.drop_table('weekly_reports')
    op.drop_table('week_periods')
    op.drop_table('report_templates')
    op.drop_table('members')
