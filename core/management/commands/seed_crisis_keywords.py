from django.core.management.base import BaseCommand
from core.models import CrisisKeyword

class Command(BaseCommand):
    help = 'Seeds the database with crisis keywords'

    def handle(self, *args, **kwargs):
        keywords_data = [
            # SUICIDE
            ("suicide", "SUICIDE"),
            ("kill myself", "SUICIDE"),
            ("end it all", "SUICIDE"),
            ("want to die", "SUICIDE"),
            ("take my own life", "SUICIDE"),
            ("better off dead", "SUICIDE"),
            
            # SELF_HARM
            ("cut myself", "SELF_HARM"),
            ("hurt myself", "SELF_HARM"),
            ("self harm", "SELF_HARM"),
            ("burn myself", "SELF_HARM"),
            
            # ABUSE
            ("hit me", "ABUSE"),
            ("abuse", "ABUSE"),
            ("beating me", "ABUSE"),
            ("scared of him", "ABUSE"),
            ("scared of her", "ABUSE"),
            
            # OVERDOSE / DRUGS
            ("overdose", "OVERDOSE"),
            ("took too many pills", "OVERDOSE"),
            ("drink until", "OVERDOSE"),
            
            # VIOLENCE
            ("kill him", "VIOLENCE"),
            ("kill her", "VIOLENCE"),
            ("hurt them", "VIOLENCE"),
            ("shoot", "VIOLENCE"),
        ]

        created_count = 0
        for word, category in keywords_data:
            obj, created = CrisisKeyword.objects.get_or_create(
                keyword=word,
                defaults={'category': category}
            )
            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {created_count} crisis keywords.'))
