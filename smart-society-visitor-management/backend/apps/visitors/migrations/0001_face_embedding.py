"""Add Visitor.face_embedding for gate face-scan matching.

Note: this app's tables were created with `migrate --run-syncdb`, so there
are no prior migrations and Django's migration *state* doesn't know the
models. A normal AddField crashes with KeyError while building that state,
so this migration applies the column with raw SQL and leaves the state
untouched (SeparateDatabaseAndState with no state operations).
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = []

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.RunSQL(
                    sql="ALTER TABLE visitors_visitor ADD face_embedding NVARCHAR(MAX) NULL;",
                    reverse_sql="ALTER TABLE visitors_visitor DROP COLUMN face_embedding;",
                )
            ],
        )
    ]
