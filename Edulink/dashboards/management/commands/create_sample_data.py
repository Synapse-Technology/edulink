from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models.student_profile import StudentProfile
from dashboards.models import Achievement, InternshipProgress
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class Command(BaseCommand):
    help = 'Create sample data for dashboard features'

    def handle(self, *args, **options):
        self.stdout.write('Creating sample dashboard data...')

        # Create sample achievements
        achievements_data = [
            {
                'name': 'Profile Pioneer',
                'description': 'Complete your profile to 100%',
                'achievement_type': 'profile',
                'icon': '👤',
                'points': 50,
                'criteria': {'target_completion': 100}
            },
            {
                'name': 'First Steps',
                'description': 'Submit your first internship application',
                'achievement_type': 'application',
                'icon': '📝',
                'points': 25,
                'criteria': {'target_applications': 1}
            },
            {
                'name': 'Application Ace',
                'description': 'Submit 5 internship applications',
                'achievement_type': 'application',
                'icon': '🎯',
                'points': 75,
                'criteria': {'target_applications': 5}
            },
            {
                'name': 'Interview Invitation',
                'description': 'Get your first interview invitation',
                'achievement_type': 'interview',
                'icon': '🤝',
                'points': 100,
                'criteria': {'target_interviews': 1}
            },
            {
                'name': 'Internship Champion',
                'description': 'Get your first internship offer',
                'achievement_type': 'acceptance',
                'icon': '🏆',
                'points': 200,
                'criteria': {'target_acceptances': 1}
            },
            {
                'name': 'Streak Master',
                'description': 'Maintain a 7-day activity streak',
                'achievement_type': 'streak',
                'icon': '🔥',
                'points': 50,
                'criteria': {'target_streak': 7}
            },
            {
                'name': 'Skill Builder',
                'description': 'Add 5 skills to your profile',
                'achievement_type': 'skill',
                'icon': '🛠️',
                'points': 75,
                'criteria': {'target_skills': 5}
            },
            {
                'name': 'Social Butterfly',
                'description': 'Connect with 3 other students',
                'achievement_type': 'social',
                'icon': '🦋',
                'points': 30,
                'criteria': {'target_connections': 3}
            }
        ]

        for achievement_data in achievements_data:
            achievement, created = Achievement.objects.get_or_create(
                name=achievement_data['name'],
                defaults=achievement_data
            )
            if created:
                self.stdout.write(f'Created achievement: {achievement.name}')

        # Create progress records for existing students
        students = StudentProfile.objects.all()
        for student in students:
            progress, created = InternshipProgress.objects.get_or_create(
                student=student,
                defaults={
                    'profile_completion': 65,
                    'total_applications': 3,
                    'applications_this_month': 2,
                    'total_interviews': 1,
                    'interviews_this_month': 1,
                    'interview_success_rate': 75.0,
                    'total_acceptances': 0,
                    'current_streak': 5,
                    'longest_streak': 12,
                    'last_activity_date': timezone.now().date() - timedelta(days=1),
                    'monthly_application_goal': 10,
                    'target_industries': ['Technology', 'Finance', 'Healthcare'],
                    'target_companies': ['Google', 'Microsoft', 'Apple'],
                    'skills_targeted': ['Python', 'JavaScript', 'React'],
                    'skills_developed': ['HTML', 'CSS', 'Git']
                }
            )
            if created:
                self.stdout.write(f'Created progress for student: {student.user.first_name}')

        self.stdout.write(
            self.style.SUCCESS('Successfully created sample dashboard data!')
        ) 