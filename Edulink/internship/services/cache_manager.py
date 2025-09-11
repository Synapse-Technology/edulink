"""Cache management for external opportunities."""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from django.core.cache import cache
from django.conf import settings
from django.utils import timezone

from ..models import ExternalOpportunitySource, ExternalOpportunity, Internship

logger = logging.getLogger(__name__)


class OpportunityCacheManager:
    """Manages caching for external opportunities and related data."""
    
    # Cache key prefixes
    OPPORTUNITY_PREFIX = "ext_opp"
    SOURCE_PREFIX = "ext_source"
    STATS_PREFIX = "ext_stats"
    SEARCH_PREFIX = "ext_search"
    
    # Cache timeouts (in seconds)
    OPPORTUNITY_TIMEOUT = 3600  # 1 hour
    SOURCE_TIMEOUT = 7200  # 2 hours
    STATS_TIMEOUT = 1800  # 30 minutes
    SEARCH_TIMEOUT = 900  # 15 minutes
    
    def __init__(self):
        self.cache_enabled = getattr(settings, 'ENABLE_EXTERNAL_CACHE', True)
        
    def _get_cache_key(self, prefix: str, identifier: str) -> str:
        """Generate a standardized cache key."""
        return f"{prefix}:{identifier}"
    
    def _is_cache_enabled(self) -> bool:
        """Check if caching is enabled."""
        return self.cache_enabled and hasattr(cache, 'get')
    
    def cache_opportunity(self, opportunity_id: int, data: Dict[str, Any], 
                        timeout: Optional[int] = None) -> bool:
        """Cache opportunity data."""
        if not self._is_cache_enabled():
            return False
            
        try:
            key = self._get_cache_key(self.OPPORTUNITY_PREFIX, str(opportunity_id))
            timeout = timeout or self.OPPORTUNITY_TIMEOUT
            
            # Add metadata
            cache_data = {
                'data': data,
                'cached_at': timezone.now().isoformat(),
                'expires_at': (timezone.now() + timedelta(seconds=timeout)).isoformat()
            }
            
            cache.set(key, json.dumps(cache_data), timeout)
            logger.debug(f"Cached opportunity {opportunity_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache opportunity {opportunity_id}: {e}")
            return False
    
    def get_cached_opportunity(self, opportunity_id: int) -> Optional[Dict[str, Any]]:
        """Retrieve cached opportunity data."""
        if not self._is_cache_enabled():
            return None
            
        try:
            key = self._get_cache_key(self.OPPORTUNITY_PREFIX, str(opportunity_id))
            cached_data = cache.get(key)
            
            if cached_data:
                data = json.loads(cached_data)
                logger.debug(f"Cache hit for opportunity {opportunity_id}")
                return data['data']
                
            logger.debug(f"Cache miss for opportunity {opportunity_id}")
            return None
            
        except Exception as e:
            logger.error(f"Failed to retrieve cached opportunity {opportunity_id}: {e}")
            return None
    
    def cache_source_data(self, source_id: int, data: Dict[str, Any], 
                         timeout: Optional[int] = None) -> bool:
        """Cache external source data."""
        if not self._is_cache_enabled():
            return False
            
        try:
            key = self._get_cache_key(self.SOURCE_PREFIX, str(source_id))
            timeout = timeout or self.SOURCE_TIMEOUT
            
            cache_data = {
                'data': data,
                'cached_at': timezone.now().isoformat(),
                'expires_at': (timezone.now() + timedelta(seconds=timeout)).isoformat()
            }
            
            cache.set(key, json.dumps(cache_data), timeout)
            logger.debug(f"Cached source data for {source_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache source {source_id}: {e}")
            return False
    
    def get_cached_source_data(self, source_id: int) -> Optional[Dict[str, Any]]:
        """Retrieve cached source data."""
        if not self._is_cache_enabled():
            return None
            
        try:
            key = self._get_cache_key(self.SOURCE_PREFIX, str(source_id))
            cached_data = cache.get(key)
            
            if cached_data:
                data = json.loads(cached_data)
                logger.debug(f"Cache hit for source {source_id}")
                return data['data']
                
            return None
            
        except Exception as e:
            logger.error(f"Failed to retrieve cached source {source_id}: {e}")
            return None
    
    def cache_search_results(self, search_params: Dict[str, Any], 
                           results: List[Dict[str, Any]], 
                           timeout: Optional[int] = None) -> bool:
        """Cache search results."""
        if not self._is_cache_enabled():
            return False
            
        try:
            # Create a hash of search parameters for the key
            import hashlib
            params_str = json.dumps(search_params, sort_keys=True)
            params_hash = hashlib.md5(params_str.encode()).hexdigest()
            
            key = self._get_cache_key(self.SEARCH_PREFIX, params_hash)
            timeout = timeout or self.SEARCH_TIMEOUT
            
            cache_data = {
                'results': results,
                'params': search_params,
                'cached_at': timezone.now().isoformat(),
                'count': len(results)
            }
            
            cache.set(key, json.dumps(cache_data), timeout)
            logger.debug(f"Cached search results for params: {search_params}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache search results: {e}")
            return False
    
    def get_cached_search_results(self, search_params: Dict[str, Any]) -> Optional[List[Dict[str, Any]]]:
        """Retrieve cached search results."""
        if not self._is_cache_enabled():
            return None
            
        try:
            import hashlib
            params_str = json.dumps(search_params, sort_keys=True)
            params_hash = hashlib.md5(params_str.encode()).hexdigest()
            
            key = self._get_cache_key(self.SEARCH_PREFIX, params_hash)
            cached_data = cache.get(key)
            
            if cached_data:
                data = json.loads(cached_data)
                logger.debug(f"Cache hit for search: {search_params}")
                return data['results']
                
            return None
            
        except Exception as e:
            logger.error(f"Failed to retrieve cached search results: {e}")
            return None
    
    def cache_statistics(self, stats_type: str, data: Dict[str, Any], 
                        timeout: Optional[int] = None) -> bool:
        """Cache statistics data."""
        if not self._is_cache_enabled():
            return False
            
        try:
            key = self._get_cache_key(self.STATS_PREFIX, stats_type)
            timeout = timeout or self.STATS_TIMEOUT
            
            cache_data = {
                'stats': data,
                'generated_at': timezone.now().isoformat()
            }
            
            cache.set(key, json.dumps(cache_data), timeout)
            logger.debug(f"Cached statistics: {stats_type}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache statistics {stats_type}: {e}")
            return False
    
    def get_cached_statistics(self, stats_type: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached statistics."""
        if not self._is_cache_enabled():
            return None
            
        try:
            key = self._get_cache_key(self.STATS_PREFIX, stats_type)
            cached_data = cache.get(key)
            
            if cached_data:
                data = json.loads(cached_data)
                logger.debug(f"Cache hit for statistics: {stats_type}")
                return data['stats']
                
            return None
            
        except Exception as e:
            logger.error(f"Failed to retrieve cached statistics {stats_type}: {e}")
            return None
    
    def invalidate_opportunity(self, opportunity_id: int) -> bool:
        """Invalidate cached opportunity data."""
        if not self._is_cache_enabled():
            return False
            
        try:
            key = self._get_cache_key(self.OPPORTUNITY_PREFIX, str(opportunity_id))
            cache.delete(key)
            logger.debug(f"Invalidated cache for opportunity {opportunity_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to invalidate opportunity cache {opportunity_id}: {e}")
            return False
    
    def invalidate_source(self, source_id: int) -> bool:
        """Invalidate cached source data."""
        if not self._is_cache_enabled():
            return False
            
        try:
            key = self._get_cache_key(self.SOURCE_PREFIX, str(source_id))
            cache.delete(key)
            logger.debug(f"Invalidated cache for source {source_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to invalidate source cache {source_id}: {e}")
            return False
    
    def invalidate_search_cache(self) -> bool:
        """Invalidate all search result caches."""
        if not self._is_cache_enabled():
            return False
            
        try:
            # This is a simplified approach - in production, you might want
            # to use cache versioning or pattern-based deletion
            cache.delete_many([key for key in cache._cache.keys() 
                             if key.startswith(self.SEARCH_PREFIX)])
            logger.debug("Invalidated all search caches")
            return True
            
        except Exception as e:
            logger.error(f"Failed to invalidate search caches: {e}")
            return False
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache usage statistics."""
        if not self._is_cache_enabled():
            return {'enabled': False}
            
        try:
            # Basic cache statistics
            stats = {
                'enabled': True,
                'backend': str(type(cache)),
                'timestamp': timezone.now().isoformat()
            }
            
            # Try to get cache-specific stats if available
            if hasattr(cache, 'get_stats'):
                stats.update(cache.get_stats())
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get cache stats: {e}")
            return {'enabled': True, 'error': str(e)}
    
    def warm_cache(self) -> Dict[str, int]:
        """Warm up the cache with frequently accessed data."""
        if not self._is_cache_enabled():
            return {'cached': 0, 'errors': 0}
            
        cached_count = 0
        error_count = 0
        
        try:
            # Cache active sources
            active_sources = ExternalOpportunitySource.objects.filter(
                is_active=True
            ).select_related()
            
            for source in active_sources:
                source_data = {
                    'id': source.id,
                    'name': source.name,
                    'source_type': source.source_type,
                    'is_active': source.is_active,
                    'last_sync': source.last_sync.isoformat() if source.last_sync else None,
                    'health_status': source.health_status
                }
                
                if self.cache_source_data(source.id, source_data):
                    cached_count += 1
                else:
                    error_count += 1
            
            # Cache recent external opportunities
            recent_opportunities = ExternalOpportunity.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=7)
            ).select_related('internship', 'source')[:100]
            
            for ext_opp in recent_opportunities:
                opp_data = {
                    'id': ext_opp.id,
                    'internship_id': ext_opp.internship.id,
                    'source_id': ext_opp.source.id,
                    'external_id': ext_opp.external_id,
                    'external_url': ext_opp.external_url,
                    'data_quality_score': float(ext_opp.data_quality_score),
                    'last_synced': ext_opp.last_synced.isoformat() if ext_opp.last_synced else None
                }
                
                if self.cache_opportunity(ext_opp.id, opp_data):
                    cached_count += 1
                else:
                    error_count += 1
            
            logger.info(f"Cache warming completed: {cached_count} cached, {error_count} errors")
            
        except Exception as e:
            logger.error(f"Cache warming failed: {e}")
            error_count += 1
        
        return {'cached': cached_count, 'errors': error_count}
    
    def get_search_results(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached search results by cache key.
        
        This method provides compatibility with the view layer that expects
        a get_search_results method.
        """
        if not self._is_cache_enabled():
            return None
            
        try:
            cached_data = cache.get(cache_key)
            
            if cached_data:
                data = json.loads(cached_data)
                logger.debug(f"Cache hit for key: {cache_key}")
                return data
                
            logger.debug(f"Cache miss for key: {cache_key}")
            return None
            
        except Exception as e:
            logger.error(f"Failed to retrieve cached data for key {cache_key}: {e}")
            return None
    
    def set_search_results(self, cache_key: str, data: Dict[str, Any], 
                          timeout: Optional[int] = None) -> bool:
        """Cache search results by cache key.
        
        This method provides compatibility with the view layer.
        """
        if not self._is_cache_enabled():
            return False
            
        try:
            timeout = timeout or self.SEARCH_TIMEOUT
            
            # Add metadata
            cache_data = {
                **data,
                'cached_at': timezone.now().isoformat(),
                'expires_at': (timezone.now() + timedelta(seconds=timeout)).isoformat()
            }
            
            cache.set(cache_key, json.dumps(cache_data), timeout)
            logger.debug(f"Cached search results for key: {cache_key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cache search results for key {cache_key}: {e}")
            return False

    def clear_all_cache(self) -> bool:
        """Clear all external opportunity related caches."""
        if not self._is_cache_enabled():
            return False
            
        try:
            prefixes = [self.OPPORTUNITY_PREFIX, self.SOURCE_PREFIX, 
                       self.STATS_PREFIX, self.SEARCH_PREFIX]
            
            for prefix in prefixes:
                # This is a simplified approach
                keys_to_delete = [key for key in cache._cache.keys() 
                                if key.startswith(prefix)]
                if keys_to_delete:
                    cache.delete_many(keys_to_delete)
            
            logger.info("Cleared all external opportunity caches")
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear all caches: {e}")
            return False