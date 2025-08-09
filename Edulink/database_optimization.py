# Database Optimization Script
# This file contains database indexes and optimizations for the Edulink backend

from django.db import models
from django.contrib.postgres.indexes import GinIndex, BTreeIndex

# Database indexes to be added to models
# These should be added to the respective model Meta classes

DATABASE_INDEXES = {
    'Application': [
        # Composite index for filtering applications by student and status
        models.Index(fields=['student', 'status'], name='app_student_status_idx'),
        # Index for filtering by internship
        models.Index(fields=['internship'], name='app_internship_idx'),
        # Index for ordering by application date
        models.Index(fields=['-application_date'], name='app_date_idx'),
        # Composite index for employer queries
        models.Index(fields=['internship__employer', 'status'], name='app_employer_status_idx'),
    ],
    
    'Internship': [
        # Index for active internships
        models.Index(fields=['is_active', 'is_verified'], name='internship_active_verified_idx'),
        # Index for deadline filtering
        models.Index(fields=['deadline'], name='internship_deadline_idx'),
        # Index for date range queries
        models.Index(fields=['start_date', 'end_date'], name='internship_date_range_idx'),
        # Index for employer queries
        models.Index(fields=['employer', 'is_active'], name='internship_employer_active_idx'),
        # Index for location-based searches
        models.Index(fields=['location'], name='internship_location_idx'),
        # Index for category filtering
        models.Index(fields=['category', 'is_active'], name='internship_category_active_idx'),
    ],
    
    'LogbookEntry': [
        # Composite index for student internship queries
        models.Index(fields=['student', 'internship'], name='logbook_student_internship_idx'),
        # Index for week number queries
        models.Index(fields=['internship', 'week_number'], name='logbook_week_idx'),
        # Index for status filtering
        models.Index(fields=['status', 'date_submitted'], name='logbook_status_date_idx'),
        # Index for overdue entries
        models.Index(fields=['status', 'week_number'], name='logbook_status_week_idx'),
    ],
    
    'SupervisorFeedback': [
        # Index for log entry queries
        models.Index(fields=['log_entry'], name='feedback_logentry_idx'),
        # Index for supervisor queries
        models.Index(fields=['company_supervisor'], name='feedback_supervisor_idx'),
        # Index for date ordering
        models.Index(fields=['-created_at'], name='feedback_created_idx'),
    ],
    
    'User': [
        # Index for email lookups
        models.Index(fields=['email'], name='user_email_idx'),
        # Index for active users
        models.Index(fields=['is_active', 'is_email_verified'], name='user_active_verified_idx'),
    ],
    
    'StudentProfile': [
        # Index for student ID lookups
        models.Index(fields=['student_id'], name='student_id_idx'),
        # Index for user queries
        models.Index(fields=['user'], name='student_user_idx'),
    ],
    
    'EmployerProfile': [
        # Index for company name searches
        models.Index(fields=['company_name'], name='employer_company_idx'),
        # Index for verified employers
        models.Index(fields=['is_verified'], name='employer_verified_idx'),
        # Index for industry filtering
        models.Index(fields=['industry'], name='employer_industry_idx'),
    ],
    
    'Notification': [
        # Index for recipient queries
        models.Index(fields=['recipient', 'is_read'], name='notification_recipient_read_idx'),
        # Index for date ordering
        models.Index(fields=['-created_at'], name='notification_created_idx'),
        # Index for notification type
        models.Index(fields=['notification_type'], name='notification_type_idx'),
    ],
}

# Query optimization patterns
QUERY_OPTIMIZATIONS = {
    'select_related': {
        'Application': ['student__user', 'internship__employer', 'internship__institution'],
        'LogbookEntry': ['student__user', 'internship__employer'],
        'SupervisorFeedback': ['log_entry__student__user', 'company_supervisor__user'],
        'Internship': ['employer__user', 'institution__user'],
    },
    
    'prefetch_related': {
        'Internship': ['skill_tags', 'applications__student__user'],
        'StudentProfile': ['applications__internship', 'logbook_entries__internship'],
        'EmployerProfile': ['internships__applications', 'supervisor_feedbacks'],
    },
}

# Database connection optimization settings
DATABASE_OPTIMIZATION_SETTINGS = {
    'OPTIONS': {
        'MAX_CONNS': 20,
        'OPTIONS': {
            'MAX_CONNS': 20,
            'CONN_MAX_AGE': 600,  # 10 minutes
        }
    },
    'CONN_MAX_AGE': 600,
    'ATOMIC_REQUESTS': True,
}

# Cache configuration for database queries
CACHE_SETTINGS = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
        },
        'KEY_PREFIX': 'edulink',
        'TIMEOUT': 300,  # 5 minutes default timeout
    }
}

# Commonly cached queries
CACHED_QUERIES = {
    'active_internships': 'internships:active',
    'student_applications': 'applications:student:{}',
    'employer_internships': 'internships:employer:{}',
    'logbook_entries': 'logbook:student:{}:internship:{}',
    'notifications': 'notifications:user:{}',
}

# Database monitoring queries
MONITORING_QUERIES = {
    'slow_queries': """
        SELECT query, mean_time, calls, total_time
        FROM pg_stat_statements
        WHERE mean_time > 100
        ORDER BY mean_time DESC
        LIMIT 10;
    """,
    
    'index_usage': """
        SELECT schemaname, tablename, attname, n_distinct, correlation
        FROM pg_stats
        WHERE schemaname = 'public'
        ORDER BY n_distinct DESC;
    """,
    
    'table_sizes': """
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    """,
}

# Performance tips and best practices
PERFORMANCE_TIPS = """
Database Performance Optimization Tips:

1. Use select_related() for foreign key relationships
2. Use prefetch_related() for many-to-many and reverse foreign key relationships
3. Add database indexes for frequently queried fields
4. Use database-level constraints for data integrity
5. Implement query caching for expensive operations
6. Monitor slow queries and optimize them
7. Use database connection pooling
8. Implement proper pagination for large datasets
9. Use database aggregation instead of Python loops
10. Consider denormalization for read-heavy operations

Example optimized queries:

# Bad
applications = Application.objects.all()
for app in applications:
    print(app.student.user.username)
    print(app.internship.employer.company_name)

# Good
applications = Application.objects.select_related(
    'student__user', 'internship__employer'
).all()
for app in applications:
    print(app.student.user.username)
    print(app.internship.employer.company_name)

# Bad
student = StudentProfile.objects.get(id=1)
for application in student.applications.all():
    print(application.internship.title)

# Good
student = StudentProfile.objects.prefetch_related(
    'applications__internship'
).get(id=1)
for application in student.applications.all():
    print(application.internship.title)
"""