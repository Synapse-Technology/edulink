# Data Synchronization Strategy

## Overview

This document outlines the comprehensive data synchronization strategy for EduLink, ensuring seamless real-time data flow between frontend and backend systems. The strategy covers caching mechanisms, conflict resolution, state management, and optimistic updates for enhanced user experience.

## 1. Real-Time Data Synchronization Architecture

### WebSocket Integration

```python
# websocket/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import UserConnection

User = get_user_model()

class EduLinkConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return
        
        # Create user-specific group
        self.user_group = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        
        # Create institution-wide group for admins and supervisors
        if self.user.user_type in ['INSTITUTION_ADMIN', 'SUPERVISOR'] and self.user.institution:
            self.institution_group = f"institution_{self.user.institution.id}"
            await self.channel_layer.group_add(self.institution_group, self.channel_name)
        
        # Create department-specific group for supervisors
        if self.user.user_type == 'SUPERVISOR' and hasattr(self.user, 'supervisor'):
            self.department_group = f"department_{self.user.supervisor.department.id}"
            await self.channel_layer.group_add(self.department_group, self.channel_name)
        
        await self.accept()
        
        # Store connection
        await self.store_connection()
        
        # Send initial sync data
        await self.send_initial_sync()
    
    async def disconnect(self, close_code):
        # Remove from groups
        await self.channel_layer.group_discard(self.user_group, self.channel_name)
        
        if hasattr(self, 'institution_group'):
            await self.channel_layer.group_discard(self.institution_group, self.channel_name)
        
        if hasattr(self, 'department_group'):
            await self.channel_layer.group_discard(self.department_group, self.channel_name)
        
        # Remove connection record
        await self.remove_connection()
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'sync_request':
            await self.handle_sync_request(data)
        elif message_type == 'heartbeat':
            await self.send(text_data=json.dumps({'type': 'heartbeat_ack'}))
        elif message_type == 'subscribe':
            await self.handle_subscription(data)
    
    async def handle_sync_request(self, data):
        """Handle client sync requests"""
        entity_type = data.get('entity_type')
        last_sync = data.get('last_sync')
        
        sync_data = await self.get_sync_data(entity_type, last_sync)
        
        await self.send(text_data=json.dumps({
            'type': 'sync_response',
            'entity_type': entity_type,
            'data': sync_data,
            'timestamp': timezone.now().isoformat()
        }))
    
    async def handle_subscription(self, data):
        """Handle entity subscription requests"""
        entity_type = data.get('entity_type')
        entity_id = data.get('entity_id')
        
        if entity_type and entity_id:
            group_name = f"{entity_type}_{entity_id}"
            await self.channel_layer.group_add(group_name, self.channel_name)
    
    # WebSocket event handlers
    async def entity_updated(self, event):
        """Send entity update to client"""
        await self.send(text_data=json.dumps({
            'type': 'entity_updated',
            'entity_type': event['entity_type'],
            'entity_id': event['entity_id'],
            'data': event['data'],
            'timestamp': event['timestamp']
        }))
    
    async def entity_created(self, event):
        """Send entity creation to client"""
        await self.send(text_data=json.dumps({
            'type': 'entity_created',
            'entity_type': event['entity_type'],
            'data': event['data'],
            'timestamp': event['timestamp']
        }))
    
    async def entity_deleted(self, event):
        """Send entity deletion to client"""
        await self.send(text_data=json.dumps({
            'type': 'entity_deleted',
            'entity_type': event['entity_type'],
            'entity_id': event['entity_id'],
            'timestamp': event['timestamp']
        }))
    
    async def notification_received(self, event):
        """Send notification to client"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': event['data'],
            'timestamp': event['timestamp']
        }))
    
    @database_sync_to_async
    def store_connection(self):
        UserConnection.objects.update_or_create(
            user=self.user,
            defaults={
                'channel_name': self.channel_name,
                'connected_at': timezone.now(),
                'is_active': True
            }
        )
    
    @database_sync_to_async
    def remove_connection(self):
        UserConnection.objects.filter(
            user=self.user,
            channel_name=self.channel_name
        ).update(is_active=False, disconnected_at=timezone.now())
    
    @database_sync_to_async
    def get_sync_data(self, entity_type, last_sync):
        """Get incremental sync data"""
        sync_service = SyncService(self.user)
        return sync_service.get_incremental_data(entity_type, last_sync)
    
    async def send_initial_sync(self):
        """Send initial synchronization data"""
        initial_data = await self.get_initial_sync_data()
        
        await self.send(text_data=json.dumps({
            'type': 'initial_sync',
            'data': initial_data,
            'timestamp': timezone.now().isoformat()
        }))
    
    @database_sync_to_async
    def get_initial_sync_data(self):
        """Get initial data for user"""
        sync_service = SyncService(self.user)
        return sync_service.get_initial_data()
```

### Sync Service Implementation

```python
# services/sync_service.py
from django.utils import timezone
from datetime import datetime, timedelta
from django.core.serializers import serialize
from django.db.models import Q

class SyncService:
    def __init__(self, user):
        self.user = user
        self.entity_permissions = self.get_user_entity_permissions()
    
    def get_user_entity_permissions(self):
        """Get entities user can access"""
        permissions = {
            'departments': [],
            'courses': [],
            'students': [],
            'supervisors': [],
            'applications': [],
            'internships': []
        }
        
        if self.user.user_type == 'SYSTEM_ADMIN':
            # System admin can access all entities
            permissions = {
                'departments': Department.objects.all(),
                'courses': Course.objects.all(),
                'students': Student.objects.all(),
                'supervisors': Supervisor.objects.all(),
                'applications': Application.objects.all(),
                'internships': Internship.objects.all()
            }
        
        elif self.user.user_type == 'INSTITUTION_ADMIN':
            # Institution admin can access institution entities
            institution = self.user.institution
            permissions = {
                'departments': Department.objects.filter(institution=institution),
                'courses': Course.objects.filter(department__institution=institution),
                'students': Student.objects.filter(major__department__institution=institution),
                'supervisors': Supervisor.objects.filter(department__institution=institution),
                'applications': Application.objects.filter(
                    Q(student__major__department__institution=institution) |
                    Q(internship__supervisor__department__institution=institution)
                ),
                'internships': Internship.objects.filter(supervisor__department__institution=institution)
            }
        
        elif self.user.user_type == 'SUPERVISOR':
            # Supervisor can access department entities
            supervisor = self.user.supervisor
            permissions = {
                'departments': Department.objects.filter(pk=supervisor.department.pk),
                'courses': Course.objects.filter(department=supervisor.department),
                'students': Student.objects.filter(
                    Q(major__department=supervisor.department) |
                    Q(supervised_by=supervisor)
                ),
                'supervisors': Supervisor.objects.filter(department=supervisor.department),
                'applications': Application.objects.filter(
                    Q(internship__supervisor=supervisor) |
                    Q(student__major__department=supervisor.department)
                ),
                'internships': Internship.objects.filter(supervisor=supervisor)
            }
        
        elif self.user.user_type == 'STUDENT':
            # Student can access own data and related entities
            student = self.user.student
            permissions = {
                'departments': Department.objects.filter(pk=student.major.department.pk) if student.major else Department.objects.none(),
                'courses': Course.objects.filter(
                    Q(department=student.major.department) |
                    Q(enrolled_students=student)
                ) if student.major else Course.objects.none(),
                'students': Student.objects.filter(pk=student.pk),
                'supervisors': Supervisor.objects.filter(
                    Q(department=student.major.department) |
                    Q(supervised_students=student)
                ) if student.major else Supervisor.objects.none(),
                'applications': Application.objects.filter(student=student),
                'internships': Internship.objects.filter(
                    Q(applications__student=student) |
                    Q(supervisor__department=student.major.department)
                ) if student.major else Internship.objects.none()
            }
        
        return permissions
    
    def get_initial_data(self):
        """Get initial synchronization data"""
        data = {}
        
        for entity_type, queryset in self.entity_permissions.items():
            data[entity_type] = self.serialize_queryset(queryset)
        
        return data
    
    def get_incremental_data(self, entity_type, last_sync):
        """Get incremental changes since last sync"""
        if entity_type not in self.entity_permissions:
            return []
        
        queryset = self.entity_permissions[entity_type]
        
        if last_sync:
            try:
                last_sync_dt = datetime.fromisoformat(last_sync.replace('Z', '+00:00'))
                queryset = queryset.filter(updated_at__gt=last_sync_dt)
            except ValueError:
                pass  # Invalid date format, return all data
        
        return self.serialize_queryset(queryset)
    
    def serialize_queryset(self, queryset):
        """Serialize queryset to JSON-compatible format"""
        if not queryset.exists():
            return []
        
        # Use Django's serializer with custom fields
        serialized = serialize('json', queryset)
        data = json.loads(serialized)
        
        # Add computed fields and relationships
        for item in data:
            model_class = queryset.model
            obj = model_class.objects.get(pk=item['pk'])
            
            # Add computed fields based on model type
            if hasattr(obj, 'get_computed_fields'):
                item['fields'].update(obj.get_computed_fields())
        
        return data

class SyncEventDispatcher:
    """Dispatch sync events to WebSocket consumers"""
    
    @staticmethod
    def dispatch_entity_update(entity_type, entity_id, data, affected_users=None):
        """Dispatch entity update event"""
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        
        event_data = {
            'type': 'entity_updated',
            'entity_type': entity_type,
            'entity_id': entity_id,
            'data': data,
            'timestamp': timezone.now().isoformat()
        }
        
        if affected_users:
            # Send to specific users
            for user_id in affected_users:
                group_name = f"user_{user_id}"
                async_to_sync(channel_layer.group_send)(group_name, event_data)
        else:
            # Send to entity-specific group
            group_name = f"{entity_type}_{entity_id}"
            async_to_sync(channel_layer.group_send)(group_name, event_data)
    
    @staticmethod
    def dispatch_entity_creation(entity_type, data, institution_id=None, department_id=None):
        """Dispatch entity creation event"""
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        
        event_data = {
            'type': 'entity_created',
            'entity_type': entity_type,
            'data': data,
            'timestamp': timezone.now().isoformat()
        }
        
        # Send to relevant groups
        if institution_id:
            group_name = f"institution_{institution_id}"
            async_to_sync(channel_layer.group_send)(group_name, event_data)
        
        if department_id:
            group_name = f"department_{department_id}"
            async_to_sync(channel_layer.group_send)(group_name, event_data)
    
    @staticmethod
    def dispatch_entity_deletion(entity_type, entity_id, institution_id=None, department_id=None):
        """Dispatch entity deletion event"""
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        
        event_data = {
            'type': 'entity_deleted',
            'entity_type': entity_type,
            'entity_id': entity_id,
            'timestamp': timezone.now().isoformat()
        }
        
        # Send to relevant groups
        if institution_id:
            group_name = f"institution_{institution_id}"
            async_to_sync(channel_layer.group_send)(group_name, event_data)
        
        if department_id:
            group_name = f"department_{department_id}"
            async_to_sync(channel_layer.group_send)(group_name, event_data)
```

## 2. Frontend State Management

### Redux-like State Manager

```javascript
// js/state/state-manager.js
class StateManager {
  constructor() {
    this.state = {
      entities: {
        departments: new Map(),
        courses: new Map(),
        students: new Map(),
        supervisors: new Map(),
        applications: new Map(),
        internships: new Map()
      },
      ui: {
        loading: false,
        error: null,
        lastSync: null,
        connectionStatus: 'disconnected'
      },
      cache: {
        queries: new Map(),
        ttl: new Map()
      }
    };
    
    this.subscribers = new Set();
    this.middleware = [];
    this.syncQueue = [];
    this.conflictResolver = new ConflictResolver();
  }
  
  // State management methods
  getState() {
    return { ...this.state };
  }
  
  dispatch(action) {
    // Apply middleware
    let processedAction = action;
    for (const middleware of this.middleware) {
      processedAction = middleware(processedAction, this.state);
    }
    
    const newState = this.reducer(this.state, processedAction);
    
    if (newState !== this.state) {
      this.state = newState;
      this.notifySubscribers();
    }
    
    return processedAction;
  }
  
  subscribe(callback) {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }
  
  notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        console.error('Subscriber error:', error);
      }
    });
  }
  
  reducer(state, action) {
    switch (action.type) {
      case 'SET_LOADING':
        return {
          ...state,
          ui: { ...state.ui, loading: action.payload }
        };
      
      case 'SET_ERROR':
        return {
          ...state,
          ui: { ...state.ui, error: action.payload }
        };
      
      case 'SET_CONNECTION_STATUS':
        return {
          ...state,
          ui: { ...state.ui, connectionStatus: action.payload }
        };
      
      case 'ENTITY_CREATED':
      case 'ENTITY_UPDATED':
        return this.handleEntityUpdate(state, action);
      
      case 'ENTITY_DELETED':
        return this.handleEntityDeletion(state, action);
      
      case 'BULK_UPDATE_ENTITIES':
        return this.handleBulkUpdate(state, action);
      
      case 'CACHE_QUERY_RESULT':
        return this.handleCacheUpdate(state, action);
      
      case 'CLEAR_CACHE':
        return {
          ...state,
          cache: { queries: new Map(), ttl: new Map() }
        };
      
      default:
        return state;
    }
  }
  
  handleEntityUpdate(state, action) {
    const { entityType, data, timestamp } = action.payload;
    const entities = new Map(state.entities[entityType]);
    
    // Check for conflicts
    const existingEntity = entities.get(data.id);
    if (existingEntity && existingEntity.updated_at > timestamp) {
      // Conflict detected, resolve it
      const resolved = this.conflictResolver.resolve(existingEntity, data);
      entities.set(data.id, resolved);
    } else {
      entities.set(data.id, { ...data, updated_at: timestamp });
    }
    
    return {
      ...state,
      entities: {
        ...state.entities,
        [entityType]: entities
      },
      ui: {
        ...state.ui,
        lastSync: timestamp
      }
    };
  }
  
  handleEntityDeletion(state, action) {
    const { entityType, entityId } = action.payload;
    const entities = new Map(state.entities[entityType]);
    entities.delete(entityId);
    
    return {
      ...state,
      entities: {
        ...state.entities,
        [entityType]: entities
      }
    };
  }
  
  handleBulkUpdate(state, action) {
    const { entityType, entities: newEntities } = action.payload;
    const entityMap = new Map();
    
    newEntities.forEach(entity => {
      entityMap.set(entity.id, entity);
    });
    
    return {
      ...state,
      entities: {
        ...state.entities,
        [entityType]: entityMap
      }
    };
  }
  
  handleCacheUpdate(state, action) {
    const { queryKey, result, ttl } = action.payload;
    const queries = new Map(state.cache.queries);
    const ttlMap = new Map(state.cache.ttl);
    
    queries.set(queryKey, result);
    ttlMap.set(queryKey, Date.now() + ttl);
    
    return {
      ...state,
      cache: {
        queries,
        ttl: ttlMap
      }
    };
  }
  
  // Entity access methods
  getEntity(entityType, id) {
    return this.state.entities[entityType].get(id);
  }
  
  getEntities(entityType, filter = null) {
    const entities = Array.from(this.state.entities[entityType].values());
    
    if (filter) {
      return entities.filter(filter);
    }
    
    return entities;
  }
  
  // Cache methods
  getCachedQuery(queryKey) {
    const ttl = this.state.cache.ttl.get(queryKey);
    
    if (ttl && Date.now() > ttl) {
      // Cache expired
      this.dispatch({ type: 'CLEAR_CACHE_ENTRY', payload: { queryKey } });
      return null;
    }
    
    return this.state.cache.queries.get(queryKey);
  }
  
  setCachedQuery(queryKey, result, ttl = 300000) { // 5 minutes default
    this.dispatch({
      type: 'CACHE_QUERY_RESULT',
      payload: { queryKey, result, ttl }
    });
  }
}

// Conflict resolution
class ConflictResolver {
  resolve(localEntity, remoteEntity) {
    // Last-write-wins strategy with user preference
    if (localEntity.updated_at > remoteEntity.updated_at) {
      // Local is newer, but check if remote has important changes
      return this.mergeChanges(localEntity, remoteEntity);
    } else {
      // Remote is newer
      return remoteEntity;
    }
  }
  
  mergeChanges(local, remote) {
    // Merge non-conflicting fields
    const merged = { ...remote };
    
    // Keep local changes for specific fields if they're newer
    const preserveLocalFields = ['status', 'notes', 'priority'];
    
    preserveLocalFields.forEach(field => {
      if (local[field] && local[`${field}_updated_at`] > remote[`${field}_updated_at`]) {
        merged[field] = local[field];
        merged[`${field}_updated_at`] = local[`${field}_updated_at`];
      }
    });
    
    return merged;
  }
}

// Global state manager instance
const stateManager = new StateManager();
window.StateManager = stateManager;
```

### WebSocket Client Integration

```javascript
// js/sync/websocket-client.js
class WebSocketClient {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.subscriptions = new Set();
  }
  
  connect() {
    const token = authService.getAccessToken();
    if (!token) {
      console.error('No auth token available for WebSocket connection');
      return;
    }
    
    const wsUrl = `ws://${window.location.host}/ws/sync/?token=${token}`;
    this.socket = new WebSocket(wsUrl);
    
    this.socket.onopen = this.handleOpen.bind(this);
    this.socket.onmessage = this.handleMessage.bind(this);
    this.socket.onclose = this.handleClose.bind(this);
    this.socket.onerror = this.handleError.bind(this);
  }
  
  handleOpen() {
    console.log('WebSocket connected');
    this.stateManager.dispatch({
      type: 'SET_CONNECTION_STATUS',
      payload: 'connected'
    });
    
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    
    // Re-subscribe to entities
    this.subscriptions.forEach(subscription => {
      this.send({
        type: 'subscribe',
        entity_type: subscription.entityType,
        entity_id: subscription.entityId
      });
    });
  }
  
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'initial_sync':
          this.handleInitialSync(data);
          break;
        
        case 'entity_updated':
          this.handleEntityUpdate(data);
          break;
        
        case 'entity_created':
          this.handleEntityCreated(data);
          break;
        
        case 'entity_deleted':
          this.handleEntityDeleted(data);
          break;
        
        case 'notification':
          this.handleNotification(data);
          break;
        
        case 'heartbeat_ack':
          // Heartbeat acknowledged
          break;
        
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  handleClose(event) {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.stateManager.dispatch({
      type: 'SET_CONNECTION_STATUS',
      payload: 'disconnected'
    });
    
    this.stopHeartbeat();
    
    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
        this.connect();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }
  
  handleError(error) {
    console.error('WebSocket error:', error);
    this.stateManager.dispatch({
      type: 'SET_CONNECTION_STATUS',
      payload: 'error'
    });
  }
  
  handleInitialSync(data) {
    // Bulk update all entities
    Object.entries(data.data).forEach(([entityType, entities]) => {
      this.stateManager.dispatch({
        type: 'BULK_UPDATE_ENTITIES',
        payload: { entityType, entities }
      });
    });
    
    this.stateManager.dispatch({
      type: 'SET_LOADING',
      payload: false
    });
  }
  
  handleEntityUpdate(data) {
    this.stateManager.dispatch({
      type: 'ENTITY_UPDATED',
      payload: {
        entityType: data.entity_type,
        data: data.data,
        timestamp: data.timestamp
      }
    });
    
    // Show notification for important updates
    if (this.isImportantUpdate(data)) {
      NotificationService.show({
        type: 'info',
        title: 'Data Updated',
        message: `${data.entity_type} has been updated`
      });
    }
  }
  
  handleEntityCreated(data) {
    this.stateManager.dispatch({
      type: 'ENTITY_CREATED',
      payload: {
        entityType: data.entity_type,
        data: data.data,
        timestamp: data.timestamp
      }
    });
    
    NotificationService.show({
      type: 'success',
      title: 'New Item',
      message: `New ${data.entity_type} created`
    });
  }
  
  handleEntityDeleted(data) {
    this.stateManager.dispatch({
      type: 'ENTITY_DELETED',
      payload: {
        entityType: data.entity_type,
        entityId: data.entity_id
      }
    });
    
    NotificationService.show({
      type: 'warning',
      title: 'Item Deleted',
      message: `${data.entity_type} has been deleted`
    });
  }
  
  handleNotification(data) {
    NotificationService.show(data.data);
  }
  
  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }
  
  subscribe(entityType, entityId) {
    this.subscriptions.add({ entityType, entityId });
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.send({
        type: 'subscribe',
        entity_type: entityType,
        entity_id: entityId
      });
    }
  }
  
  unsubscribe(entityType, entityId) {
    this.subscriptions.delete({ entityType, entityId });
  }
  
  requestSync(entityType, lastSync = null) {
    this.send({
      type: 'sync_request',
      entity_type: entityType,
      last_sync: lastSync
    });
  }
  
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'heartbeat' });
    }, 30000); // 30 seconds
  }
  
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  isImportantUpdate(data) {
    // Define which updates are important enough to show notifications
    const importantFields = ['status', 'approval_status', 'assignment'];
    
    return importantFields.some(field => 
      data.data.hasOwnProperty(field)
    );
  }
  
  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
    }
  }
}

// Initialize WebSocket client
const wsClient = new WebSocketClient(stateManager);

// Auto-connect when authenticated
if (authService.isAuthenticated()) {
  wsClient.connect();
}

// Connect on login
window.addEventListener('user-logged-in', () => {
  wsClient.connect();
});

// Disconnect on logout
window.addEventListener('user-logged-out', () => {
  wsClient.disconnect();
});

window.WebSocketClient = wsClient;
```

## 3. Optimistic Updates

### Optimistic Update Manager

```javascript
// js/sync/optimistic-updates.js
class OptimisticUpdateManager {
  constructor(stateManager, apiClient) {
    this.stateManager = stateManager;
    this.apiClient = apiClient;
    this.pendingUpdates = new Map();
    this.rollbackStack = [];
  }
  
  async performOptimisticUpdate(entityType, entityId, updates, apiCall) {
    const updateId = this.generateUpdateId();
    
    try {
      // Store original state for rollback
      const originalEntity = this.stateManager.getEntity(entityType, entityId);
      this.rollbackStack.push({
        updateId,
        entityType,
        entityId,
        originalState: { ...originalEntity }
      });
      
      // Apply optimistic update
      const optimisticEntity = { ...originalEntity, ...updates, _optimistic: true };
      this.stateManager.dispatch({
        type: 'ENTITY_UPDATED',
        payload: {
          entityType,
          data: optimisticEntity,
          timestamp: new Date().toISOString()
        }
      });
      
      // Mark as pending
      this.pendingUpdates.set(updateId, {
        entityType,
        entityId,
        updates,
        timestamp: Date.now()
      });
      
      // Perform actual API call
      const result = await apiCall();
      
      // Remove optimistic flag and update with server response
      const serverEntity = { ...result, _optimistic: false };
      this.stateManager.dispatch({
        type: 'ENTITY_UPDATED',
        payload: {
          entityType,
          data: serverEntity,
          timestamp: new Date().toISOString()
        }
      });
      
      // Clean up
      this.pendingUpdates.delete(updateId);
      this.removeFromRollbackStack(updateId);
      
      return result;
      
    } catch (error) {
      // Rollback optimistic update
      this.rollbackUpdate(updateId);
      throw error;
    }
  }
  
  async performOptimisticCreation(entityType, newEntity, apiCall) {
    const tempId = this.generateTempId();
    const updateId = this.generateUpdateId();
    
    try {
      // Apply optimistic creation
      const optimisticEntity = {
        ...newEntity,
        id: tempId,
        _optimistic: true,
        _tempId: tempId
      };
      
      this.stateManager.dispatch({
        type: 'ENTITY_CREATED',
        payload: {
          entityType,
          data: optimisticEntity,
          timestamp: new Date().toISOString()
        }
      });
      
      // Mark as pending
      this.pendingUpdates.set(updateId, {
        entityType,
        entityId: tempId,
        isCreation: true,
        timestamp: Date.now()
      });
      
      // Perform actual API call
      const result = await apiCall();
      
      // Remove optimistic entity and add real one
      this.stateManager.dispatch({
        type: 'ENTITY_DELETED',
        payload: {
          entityType,
          entityId: tempId
        }
      });
      
      this.stateManager.dispatch({
        type: 'ENTITY_CREATED',
        payload: {
          entityType,
          data: { ...result, _optimistic: false },
          timestamp: new Date().toISOString()
        }
      });
      
      // Clean up
      this.pendingUpdates.delete(updateId);
      
      return result;
      
    } catch (error) {
      // Remove optimistic entity
      this.stateManager.dispatch({
        type: 'ENTITY_DELETED',
        payload: {
          entityType,
          entityId: tempId
        }
      });
      
      this.pendingUpdates.delete(updateId);
      throw error;
    }
  }
  
  rollbackUpdate(updateId) {
    const rollbackData = this.rollbackStack.find(item => item.updateId === updateId);
    
    if (rollbackData) {
      this.stateManager.dispatch({
        type: 'ENTITY_UPDATED',
        payload: {
          entityType: rollbackData.entityType,
          data: rollbackData.originalState,
          timestamp: new Date().toISOString()
        }
      });
      
      this.removeFromRollbackStack(updateId);
    }
    
    this.pendingUpdates.delete(updateId);
  }
  
  removeFromRollbackStack(updateId) {
    this.rollbackStack = this.rollbackStack.filter(item => item.updateId !== updateId);
  }
  
  generateUpdateId() {
    return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateTempId() {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getPendingUpdates() {
    return Array.from(this.pendingUpdates.values());
  }
  
  hasPendingUpdates() {
    return this.pendingUpdates.size > 0;
  }
  
  // Clean up old pending updates (in case of network issues)
  cleanupStaleUpdates(maxAge = 300000) { // 5 minutes
    const now = Date.now();
    
    for (const [updateId, update] of this.pendingUpdates.entries()) {
      if (now - update.timestamp > maxAge) {
        this.rollbackUpdate(updateId);
      }
    }
  }
}

// Global optimistic update manager
const optimisticUpdateManager = new OptimisticUpdateManager(stateManager, window.apiCall);

// Clean up stale updates every minute
setInterval(() => {
  optimisticUpdateManager.cleanupStaleUpdates();
}, 60000);

window.OptimisticUpdateManager = optimisticUpdateManager;
```

## 4. Offline Support

### Offline Queue Manager

```javascript
// js/sync/offline-manager.js
class OfflineManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.isOnline = navigator.onLine;
    this.offlineQueue = this.loadOfflineQueue();
    this.syncInProgress = false;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.stateManager.dispatch({
        type: 'SET_CONNECTION_STATUS',
        payload: 'online'
      });
      this.processOfflineQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.stateManager.dispatch({
        type: 'SET_CONNECTION_STATUS',
        payload: 'offline'
      });
    });
  }
  
  queueAction(action) {
    const queueItem = {
      id: this.generateId(),
      action,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    this.offlineQueue.push(queueItem);
    this.saveOfflineQueue();
    
    // Try to process immediately if online
    if (this.isOnline) {
      this.processOfflineQueue();
    }
    
    return queueItem.id;
  }
  
  async processOfflineQueue() {
    if (this.syncInProgress || !this.isOnline || this.offlineQueue.length === 0) {
      return;
    }
    
    this.syncInProgress = true;
    
    const processedItems = [];
    const failedItems = [];
    
    for (const item of this.offlineQueue) {
      try {
        await this.executeAction(item.action);
        processedItems.push(item.id);
      } catch (error) {
        item.retryCount++;
        
        if (item.retryCount >= 3) {
          // Max retries reached, remove from queue
          failedItems.push(item);
          processedItems.push(item.id);
        }
        
        console.error('Failed to process offline action:', error);
      }
    }
    
    // Remove processed items from queue
    this.offlineQueue = this.offlineQueue.filter(
      item => !processedItems.includes(item.id)
    );
    
    this.saveOfflineQueue();
    this.syncInProgress = false;
    
    // Notify about failed items
    if (failedItems.length > 0) {
      NotificationService.show({
        type: 'error',
        title: 'Sync Failed',
        message: `${failedItems.length} actions could not be synchronized`
      });
    }
  }
  
  async executeAction(action) {
    switch (action.type) {
      case 'CREATE_ENTITY':
        return await this.createEntity(action.payload);
      
      case 'UPDATE_ENTITY':
        return await this.updateEntity(action.payload);
      
      case 'DELETE_ENTITY':
        return await this.deleteEntity(action.payload);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
  
  async createEntity(payload) {
    const { entityType, data } = payload;
    const response = await apiCall(`/api/${entityType}/`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create ${entityType}`);
    }
    
    return await response.json();
  }
  
  async updateEntity(payload) {
    const { entityType, entityId, data } = payload;
    const response = await apiCall(`/api/${entityType}/${entityId}/`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update ${entityType}`);
    }
    
    return await response.json();
  }
  
  async deleteEntity(payload) {
    const { entityType, entityId } = payload;
    const response = await apiCall(`/api/${entityType}/${entityId}/`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete ${entityType}`);
    }
    
    return true;
  }
  
  loadOfflineQueue() {
    try {
      const stored = localStorage.getItem('edulink_offline_queue');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      return [];
    }
  }
  
  saveOfflineQueue() {
    try {
      localStorage.setItem('edulink_offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }
  
  generateId() {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getQueueStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.offlineQueue.length,
      syncInProgress: this.syncInProgress
    };
  }
  
  clearQueue() {
    this.offlineQueue = [];
    this.saveOfflineQueue();
  }
}

// Global offline manager
const offlineManager = new OfflineManager(stateManager);
window.OfflineManager = offlineManager;
```

This comprehensive data synchronization strategy ensures seamless real-time updates, efficient caching, conflict resolution, and robust offline support for the EduLink platform, providing users with a smooth and responsive experience across all devices and network conditions.