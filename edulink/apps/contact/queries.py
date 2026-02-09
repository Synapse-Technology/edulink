from .models import ContactSubmission

def get_all_submissions():
    """Read logic for all contact submissions."""
    return ContactSubmission.objects.all().order_by('-created_at')

def get_unprocessed_submissions():
    """Read logic for unprocessed contact submissions."""
    return ContactSubmission.objects.filter(is_processed=False)
