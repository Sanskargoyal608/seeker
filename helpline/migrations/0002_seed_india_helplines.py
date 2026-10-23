from django.db import migrations

from helpline.defaults import CATEGORY_DESCRIPTIONS, INDIA_HELPLINES


def seed(apps, schema_editor):
    """Idempotent: only adds what is missing, never edits or deletes staff changes."""
    Category = apps.get_model('helpline', 'HelplineCategory')
    Entry = apps.get_model('helpline', 'HelplineEntry')
    if Entry.objects.exists():
        return  # staff already maintain this table
    for name, phone, category, is_24_7, language, description in INDIA_HELPLINES:
        cat, _ = Category.objects.get_or_create(
            name=category, defaults={'description': CATEGORY_DESCRIPTIONS.get(category, '')})
        Entry.objects.get_or_create(
            name=name, phone=phone,
            defaults={'region': 'India', 'category': cat, 'is_24_7': is_24_7,
                      'language': language, 'description': description})


class Migration(migrations.Migration):
    dependencies = [('helpline', '0001_initial')]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
