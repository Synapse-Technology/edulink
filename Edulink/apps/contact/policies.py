def can_manage_contact_submissions(user):
    """
    Decide if a user can view or manage contact form submissions.
    Only platform admins should have this authority.
    """
    if not user or not user.is_authenticated:
        return False
        
    return hasattr(user, 'platform_staff_profile')
