"""Attribution template system for external opportunities."""

from typing import Dict, Any, Optional
from django.template import Template, Context
from django.utils.safestring import mark_safe
from django.conf import settings


class AttributionTemplateManager:
    """Manages attribution templates for different source types and display contexts."""
    
    # Default attribution templates
    DEFAULT_TEMPLATES = {
        'minimal': {
            'text': 'Source: {{ source_name }}',
            'html': '<span class="attribution-minimal">Source: {{ source_name }}</span>'
        },
        'standard': {
            'text': 'Source: {{ source_name }}{% if source_url %} ({{ source_url }}){% endif %}',
            'html': '''<div class="attribution-standard">
                <span class="attribution-label">Source:</span>
                {% if source_url %}
                    <a href="{{ source_url }}" target="_blank" rel="noopener noreferrer" class="attribution-link">
                        {{ source_name }}
                    </a>
                {% else %}
                    <span class="attribution-name">{{ source_name }}</span>
                {% endif %}
            </div>'''
        },
        'detailed': {
            'text': '''Source: {{ source_name }}{% if source_url %} ({{ source_url }}){% endif %}
{% if data_provider %}Data Provider: {{ data_provider }}{% endif %}
{% if last_updated %}Last Updated: {{ last_updated }}{% endif %}''',
            'html': '''<div class="attribution-detailed">
                <div class="attribution-main">
                    <span class="attribution-label">Source:</span>
                    {% if source_url %}
                        <a href="{{ source_url }}" target="_blank" rel="noopener noreferrer" class="attribution-link">
                            {{ source_name }}
                        </a>
                    {% else %}
                        <span class="attribution-name">{{ source_name }}</span>
                    {% endif %}
                </div>
                {% if data_provider %}
                    <div class="attribution-provider">
                        <span class="attribution-label">Data Provider:</span>
                        <span class="attribution-value">{{ data_provider }}</span>
                    </div>
                {% endif %}
                {% if last_updated %}
                    <div class="attribution-updated">
                        <span class="attribution-label">Last Updated:</span>
                        <span class="attribution-value">{{ last_updated }}</span>
                    </div>
                {% endif %}
            </div>'''
        },
        'card': {
            'html': '''<div class="attribution-card">
                <div class="attribution-header">
                    <i class="fas fa-external-link-alt attribution-icon"></i>
                    <span class="attribution-title">External Opportunity</span>
                </div>
                <div class="attribution-content">
                    {% if source_url %}
                        <a href="{{ source_url }}" target="_blank" rel="noopener noreferrer" class="attribution-source">
                            {{ source_name }}
                        </a>
                    {% else %}
                        <span class="attribution-source">{{ source_name }}</span>
                    {% endif %}
                    {% if quality_score %}
                        <div class="attribution-quality">
                            <span class="quality-label">Quality:</span>
                            <div class="quality-stars">
                                {% for i in quality_stars %}
                                    <i class="fas fa-star{% if not i %}-o{% endif %}"></i>
                                {% endfor %}
                            </div>
                        </div>
                    {% endif %}
                </div>
            </div>'''
        },
        'footer': {
            'html': '''<footer class="attribution-footer">
                <div class="attribution-disclaimer">
                    <p>This opportunity is provided by an external source. Please verify all details directly with the provider.</p>
                </div>
                <div class="attribution-source-info">
                    <span class="attribution-label">Source:</span>
                    {% if source_url %}
                        <a href="{{ source_url }}" target="_blank" rel="noopener noreferrer">
                            {{ source_name }}
                        </a>
                    {% else %}
                        {{ source_name }}
                    {% endif %}
                    {% if terms_url %}
                        | <a href="{{ terms_url }}" target="_blank" rel="noopener noreferrer">Terms</a>
                    {% endif %}
                    {% if privacy_url %}
                        | <a href="{{ privacy_url }}" target="_blank" rel="noopener noreferrer">Privacy</a>
                    {% endif %}
                </div>
            </footer>'''
        }
    }
    
    # CSS styles for attribution components
    ATTRIBUTION_CSS = '''
/* Attribution Styles */
.attribution-minimal {
    font-size: 0.8em;
    color: #666;
    font-style: italic;
}

.attribution-standard {
    margin: 10px 0;
    padding: 8px;
    background-color: #f8f9fa;
    border-left: 3px solid #007bff;
    font-size: 0.9em;
}

.attribution-standard .attribution-label {
    font-weight: 600;
    color: #495057;
}

.attribution-standard .attribution-link {
    color: #007bff;
    text-decoration: none;
}

.attribution-standard .attribution-link:hover {
    text-decoration: underline;
}

.attribution-detailed {
    margin: 15px 0;
    padding: 12px;
    background-color: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    font-size: 0.9em;
}

.attribution-detailed .attribution-main {
    margin-bottom: 8px;
}

.attribution-detailed .attribution-label {
    font-weight: 600;
    color: #495057;
    margin-right: 5px;
}

.attribution-detailed .attribution-value {
    color: #6c757d;
}

.attribution-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px;
    border-radius: 8px;
    margin: 10px 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.attribution-card .attribution-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
}

.attribution-card .attribution-icon {
    margin-right: 8px;
    opacity: 0.8;
}

.attribution-card .attribution-title {
    font-weight: 600;
    font-size: 0.9em;
}

.attribution-card .attribution-source {
    color: white;
    text-decoration: none;
    font-weight: 500;
}

.attribution-card .attribution-source:hover {
    text-decoration: underline;
}

.attribution-card .attribution-quality {
    margin-top: 8px;
    display: flex;
    align-items: center;
}

.attribution-card .quality-label {
    font-size: 0.8em;
    margin-right: 5px;
    opacity: 0.9;
}

.attribution-card .quality-stars {
    display: flex;
}

.attribution-card .quality-stars i {
    font-size: 0.8em;
    margin-right: 2px;
    opacity: 0.9;
}

.attribution-footer {
    margin-top: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border-top: 1px solid #dee2e6;
    font-size: 0.85em;
}

.attribution-footer .attribution-disclaimer {
    margin-bottom: 10px;
    color: #6c757d;
    font-style: italic;
}

.attribution-footer .attribution-source-info {
    color: #495057;
}

.attribution-footer .attribution-source-info a {
    color: #007bff;
    text-decoration: none;
}

.attribution-footer .attribution-source-info a:hover {
    text-decoration: underline;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .attribution-detailed,
    .attribution-standard {
        padding: 8px;
        font-size: 0.8em;
    }
    
    .attribution-card {
        padding: 10px;
    }
    
    .attribution-footer {
        padding: 10px;
        font-size: 0.8em;
    }
}
'''
    
    def __init__(self):
        self.custom_templates = getattr(settings, 'EXTERNAL_ATTRIBUTION_TEMPLATES', {})
        self.default_style = getattr(settings, 'DEFAULT_ATTRIBUTION_STYLE', 'standard')
        self.require_attribution = getattr(settings, 'REQUIRE_SOURCE_ATTRIBUTION', True)
    
    def render_attribution(self, 
                          source_data: Dict[str, Any], 
                          style: str = None, 
                          format_type: str = 'html',
                          context_data: Optional[Dict[str, Any]] = None) -> str:
        """Render attribution using specified style and format."""
        
        if not self.require_attribution:
            return ""
        
        style = style or self.default_style
        context_data = context_data or {}
        
        # Get template
        template_content = self._get_template(style, format_type)
        if not template_content:
            return ""
        
        # Prepare context
        context = self._prepare_context(source_data, context_data)
        
        # Render template
        try:
            template = Template(template_content)
            rendered = template.render(Context(context))
            
            if format_type == 'html':
                return mark_safe(rendered)
            else:
                return rendered
                
        except Exception as e:
            # Fallback to simple attribution
            source_name = source_data.get('source_name', 'External Source')
            if format_type == 'html':
                return mark_safe(f'<span class="attribution-fallback">Source: {source_name}</span>')
            else:
                return f"Source: {source_name}"
    
    def _get_template(self, style: str, format_type: str) -> Optional[str]:
        """Get template content for specified style and format."""
        
        # Check custom templates first
        if style in self.custom_templates:
            custom_template = self.custom_templates[style]
            if format_type in custom_template:
                return custom_template[format_type]
        
        # Check default templates
        if style in self.DEFAULT_TEMPLATES:
            default_template = self.DEFAULT_TEMPLATES[style]
            if format_type in default_template:
                return default_template[format_type]
        
        # Fallback to standard template
        if 'standard' in self.DEFAULT_TEMPLATES:
            standard_template = self.DEFAULT_TEMPLATES['standard']
            if format_type in standard_template:
                return standard_template[format_type]
        
        return None
    
    def _prepare_context(self, source_data: Dict[str, Any], context_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare template context with source and additional data."""
        
        context = {
            # Source information
            'source_name': source_data.get('source_name', 'External Source'),
            'source_url': source_data.get('source_url', ''),
            'data_provider': source_data.get('data_provider', ''),
            'terms_url': source_data.get('terms_of_service_url', ''),
            'privacy_url': source_data.get('privacy_policy_url', ''),
            
            # Opportunity information
            'last_updated': source_data.get('last_updated', ''),
            'quality_score': source_data.get('quality_score', 0),
            
            # Additional context
            **context_data
        }
        
        # Generate quality stars for display
        if context['quality_score']:
            quality_score = float(context['quality_score'])
            stars = []
            for i in range(5):
                stars.append(i < quality_score)
            context['quality_stars'] = stars
        
        return context
    
    def get_attribution_css(self) -> str:
        """Get CSS styles for attribution components."""
        return self.ATTRIBUTION_CSS
    
    def register_custom_template(self, name: str, templates: Dict[str, str]):
        """Register a custom attribution template."""
        self.custom_templates[name] = templates
    
    def get_available_styles(self) -> list:
        """Get list of available attribution styles."""
        styles = list(self.DEFAULT_TEMPLATES.keys())
        styles.extend(self.custom_templates.keys())
        return sorted(set(styles))
    
    def validate_template(self, template_content: str) -> Dict[str, Any]:
        """Validate template syntax and required variables."""
        try:
            template = Template(template_content)
            
            # Test render with minimal context
            test_context = Context({
                'source_name': 'Test Source',
                'source_url': 'https://example.com',
                'data_provider': 'Test Provider'
            })
            
            rendered = template.render(test_context)
            
            return {
                'valid': True,
                'rendered_sample': rendered[:200] + '...' if len(rendered) > 200 else rendered
            }
            
        except Exception as e:
            return {
                'valid': False,
                'error': str(e)
            }
    
    def generate_attribution_preview(self, source_data: Dict[str, Any]) -> Dict[str, str]:
        """Generate preview of all attribution styles for given source data."""
        previews = {}
        
        for style in self.get_available_styles():
            try:
                # HTML preview
                html_preview = self.render_attribution(source_data, style, 'html')
                previews[f"{style}_html"] = html_preview
                
                # Text preview
                text_preview = self.render_attribution(source_data, style, 'text')
                if text_preview:
                    previews[f"{style}_text"] = text_preview
                    
            except Exception as e:
                previews[f"{style}_error"] = str(e)
        
        return previews


# Global instance
attribution_manager = AttributionTemplateManager()