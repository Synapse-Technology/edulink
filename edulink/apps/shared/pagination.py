"""
Standardized pagination for EduLink API endpoints.

Following REST API best practices:
- Cursor-based pagination for large datasets (prevents skips/duplicates)
- Offset-based pagination for UI flexibility
- Configurable page sizes per viewset
"""

from rest_framework.pagination import PageNumberPagination, CursorPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination with 50 results per page.
    Suitable for most list endpoints.
    
    Features:
    - Page-based navigation (frontend friendly)
    - Default 50 items per page (configurable)
    - Shows total count
    - Compatible with filters and search
    """
    page_size = 50
    page_size_query_param = 'page_size'
    page_size_query_description = 'Number of results to return per page.'
    max_page_size = 1000
    
    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data
        })


class LargeResultsSetPagination(PageNumberPagination):
    """
    Pagination with 100 results per page.
    For endpoints that return many small items (e.g., activity logs, events).
    """
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000


class SmallResultsSetPagination(PageNumberPagination):
    """
    Pagination with 20 results per page.
    For endpoints with heavy computations or large response objects.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class CursorBasedPagination(CursorPagination):
    """
    Cursor-based pagination for chronological data.
    
    Prevents:
    - Record skipping (when new items inserted at top)
    - Record duplication (when items deleted)
    
    Ideal for:
    - Real-time feeds (applications, notifications)
    - Event logs
    - Activity streams
    
    Example in views:
    ```python
    class ApplicationListView(viewsets.ViewSet):
        pagination_class = CursorBasedPagination
        def list(self, request):
            queryset = queryset.order_by('-created_at')
            page = self.paginate_queryset(queryset, request)
            ...
    ```
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
    ordering = '-created_at'  # Default ordering by newest first


class ExtendedCursorPagination(CursorPagination):
    """
    Cursor-based pagination with 100 items per page.
    For endpoints needing both performance and consistency.
    """
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 500
    ordering = '-created_at'


class NotificationPagination(PageNumberPagination):
    """
    Pagination optimized for notifications.
    Usually displayed in reverse chronological order.
    """
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class LedgerEventPagination(PageNumberPagination):
    """
    Pagination for ledger events (audit trail).
    Shows more items per page since events are small.
    """
    page_size = 200
    page_size_query_param = 'page_size'
    max_page_size = 1000
    
    def get_paginated_response(self, data):
        """Include total count in response for loading indicators."""
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'page_size': self.page_size,
            'results': data
        })
