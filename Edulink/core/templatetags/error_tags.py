from django import template
from django.utils.safestring import mark_safe
from django.utils.html import format_html
from django.forms import Form
import json

register = template.Library()

@register.inclusion_tag('components/error_display.html')
def error_display(error_type='error', title='', message='', details='', actions=None, 
                 display_type='inline', dismissible=True, container_class=''):
    """
    Render an error display component
    
    Args:
        error_type: Type of error ('info', 'success', 'warning', 'error', 'critical')
        title: Error title
        message: Error message
        details: Additional error details
        actions: List of action dictionaries with 'text', 'url', 'onclick', 'secondary' keys
        display_type: Display type ('inline', 'compact')
        dismissible: Whether the error can be dismissed
        container_class: Additional CSS classes for the container
    """
    if actions is None:
        actions = []
    
    return {
        'error_type': error_type,
        'title': title,
        'message': message,
        'details': details,
        'actions': actions,
        'display_type': display_type,
        'dismissible': dismissible,
        'container_class': container_class,
        'icon_class': get_icon_class(error_type)
    }

@register.inclusion_tag('components/form_errors.html')
def form_errors(form, field_name=None):
    """
    Display form errors for a specific field or all form errors
    
    Args:
        form: Django form instance
        field_name: Specific field name to show errors for (optional)
    """
    if field_name:
        field = form[field_name] if field_name in form.fields else None
        errors = field.errors if field else []
        return {
            'field_errors': [{'field': field_name, 'errors': errors}] if errors else [],
            'non_field_errors': []
        }
    else:
        field_errors = []
        for field_name, field in form.fields.items():
            field_obj = form[field_name]
            if field_obj.errors:
                field_errors.append({
                    'field': field_name,
                    'label': field.label or field_name.replace('_', ' ').title(),
                    'errors': field_obj.errors
                })
        
        return {
            'field_errors': field_errors,
            'non_field_errors': form.non_field_errors() if hasattr(form, 'non_field_errors') else []
        }

@register.simple_tag
def error_js_config():
    """
    Generate JavaScript configuration for error handling
    """
    config = {
        'defaultTimeout': 5000,
        'criticalTimeout': 0,
        'maxToasts': 5,
        'enableSounds': False,
        'enableAnimations': True
    }
    return mark_safe(f'window.ERROR_CONFIG = {json.dumps(config)};')

@register.simple_tag
def error_toast_js(error_type, title, message='', details='', actions=None, auto_hide=None):
    """
    Generate JavaScript code to show a toast notification
    
    Args:
        error_type: Type of error ('info', 'success', 'warning', 'error', 'critical')
        title: Error title
        message: Error message
        details: Additional error details
        actions: List of action dictionaries
        auto_hide: Auto-hide timeout in milliseconds
    """
    if actions is None:
        actions = []
    
    config = {
        'type': error_type,
        'title': title,
        'message': message,
        'details': details,
        'actions': actions,
        'displayType': 'toast'
    }
    
    if auto_hide is not None:
        config['autoHide'] = auto_hide
    
    js_code = f'window.ErrorHandler.showError({json.dumps(config)});'
    return mark_safe(js_code)

@register.simple_tag
def error_modal_js(error_type, title, message='', details='', actions=None):
    """
    Generate JavaScript code to show a modal error
    """
    if actions is None:
        actions = []
    
    config = {
        'type': error_type,
        'title': title,
        'message': message,
        'details': details,
        'actions': actions,
        'displayType': 'modal'
    }
    
    js_code = f'window.ErrorHandler.showError({json.dumps(config)});'
    return mark_safe(js_code)

@register.filter
def error_class(error_type):
    """
    Get CSS class for error type
    """
    return f'error-component--{error_type}'

@register.filter
def field_has_errors(form, field_name):
    """
    Check if a form field has errors
    """
    if not isinstance(form, Form) or field_name not in form.fields:
        return False
    return bool(form[field_name].errors)

@register.simple_tag
def error_field_class(form, field_name, base_class='form-control'):
    """
    Get CSS class for form field with error state
    """
    classes = [base_class]
    if field_has_errors(form, field_name):
        classes.append('is-invalid')
    return ' '.join(classes)

@register.inclusion_tag('components/api_error_handler.html')
def api_error_handler(endpoint_name='', retry_action=''):
    """
    Include JavaScript for API error handling
    
    Args:
        endpoint_name: Name of the API endpoint for context
        retry_action: JavaScript function to call for retry
    """
    return {
        'endpoint_name': endpoint_name,
        'retry_action': retry_action
    }

@register.simple_tag
def validation_errors_js(form):
    """
    Generate JavaScript to display form validation errors
    """
    if not isinstance(form, Form) or not form.errors:
        return ''
    
    errors = []
    
    # Field errors
    for field_name, field_errors in form.errors.items():
        if field_name == '__all__':
            continue
        
        field = form.fields.get(field_name)
        label = field.label if field else field_name.replace('_', ' ').title()
        
        for error in field_errors:
            errors.append({
                'field': field_name,
                'label': label,
                'message': str(error)
            })
    
    # Non-field errors
    if '__all__' in form.errors:
        for error in form.errors['__all__']:
            errors.append({
                'field': '__all__',
                'label': 'Form Error',
                'message': str(error)
            })
    
    if not errors:
        return ''
    
    js_code = f"""
    document.addEventListener('DOMContentLoaded', function() {{
        const errors = {json.dumps(errors)};
        errors.forEach(function(error) {{
            if (error.field === '__all__') {{
                window.ErrorHandler.showError({{
                    type: 'error',
                    title: error.label,
                    message: error.message,
                    displayType: 'inline'
                }});
            }} else {{
                const field = document.querySelector('[name="' + error.field + '"]');
                if (field) {{
                    window.ErrorHandler.showFieldError(field, error.message);
                }}
            }}
        }});
    }});
    """
    
    return mark_safe(js_code)

@register.simple_tag(takes_context=True)
def messages_as_errors(context):
    """
    Convert Django messages to error display components
    """
    request = context.get('request')
    if not request:
        return ''
    
    from django.contrib import messages
    
    message_tags = {
        messages.DEBUG: 'info',
        messages.INFO: 'info',
        messages.SUCCESS: 'success',
        messages.WARNING: 'warning',
        messages.ERROR: 'error'
    }
    
    js_code_parts = []
    
    for message in messages.get_messages(request):
        error_type = message_tags.get(message.level, 'info')
        
        config = {
            'type': error_type,
            'title': message.tags.title() if message.tags else 'Notification',
            'message': str(message),
            'displayType': 'toast'
        }
        
        js_code_parts.append(f'window.ErrorHandler.showError({json.dumps(config)});')
    
    if js_code_parts:
        js_code = f"""
        document.addEventListener('DOMContentLoaded', function() {{
            {chr(10).join(js_code_parts)}
        }});
        """
        return mark_safe(js_code)
    
    return ''

@register.simple_tag
def csrf_error_handler():
    """
    Generate JavaScript for CSRF error handling
    """
    js_code = """
    document.addEventListener('DOMContentLoaded', function() {
        // Override default CSRF failure handling
        window.addEventListener('error', function(event) {
            if (event.error && event.error.message && event.error.message.includes('CSRF')) {
                window.ErrorHandler.showError({
                    type: 'warning',
                    title: 'Security Token Expired',
                    message: 'Your session has expired. Please refresh the page and try again.',
                    actions: [{
                        text: 'Refresh Page',
                        action: function() { window.location.reload(); }
                    }]
                });
                event.preventDefault();
            }
        });
        
        // Handle AJAX CSRF errors
        if (window.jQuery) {
            $(document).ajaxError(function(event, xhr, settings) {
                if (xhr.status === 403 && xhr.responseJSON && xhr.responseJSON.error === 'CSRF token missing or incorrect') {
                    window.ErrorHandler.showError({
                        type: 'warning',
                        title: 'Security Token Error',
                        message: 'Your security token has expired. Please refresh the page.',
                        actions: [{
                            text: 'Refresh Page',
                            action: function() { window.location.reload(); }
                        }]
                    });
                }
            });
        }
    });
    """
    return mark_safe(js_code)

def get_icon_class(error_type):
    """
    Get Font Awesome icon class for error type
    """
    icons = {
        'info': 'fas fa-info-circle',
        'success': 'fas fa-check-circle',
        'warning': 'fas fa-exclamation-triangle',
        'error': 'fas fa-exclamation-circle',
        'critical': 'fas fa-times-circle'
    }
    return icons.get(error_type, icons['error'])

@register.simple_tag
def error_styles_link():
    """
    Generate link tag for error component styles
    """
    return mark_safe('<link rel="stylesheet" href="/static/css/error-components.css">')

@register.simple_tag
def error_script_tag():
    """
    Generate script tag for error handler JavaScript
    """
    return mark_safe('<script src="/static/js/error-handler.js"></script>')

@register.simple_tag
def error_dependencies():
    """
    Include all error handling dependencies (CSS and JS)
    """
    return mark_safe(
        '<link rel="stylesheet" href="/static/css/error-components.css">\n'
        '<script src="/static/js/error-handler.js"></script>'
    )