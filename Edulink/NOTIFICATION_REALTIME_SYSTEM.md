# EduLink Notification and Real-Time Update System

## Overview
This document outlines the comprehensive notification and real-time update system for EduLink, designed to keep all stakeholders informed about workflow changes, application status updates, and important events across the platform.

## System Architecture

### 1. Notification Types

#### A. Real-Time Notifications (WebSocket)
- Application status changes
- Supervisor assignments
- Department/course updates
- New internship opportunities
- Deadline reminders
- System announcements

#### B. Email Notifications
- Application confirmations
- Status change alerts
- Weekly/monthly summaries
- Critical system updates
- Password reset notifications

#### C. In-App Notifications
- Toast messages for immediate feedback
- Notification center for historical messages
- Badge counters for unread notifications
- Priority-based notification display

### 2. Django Backend Implementation

#### A. Notification Models

```python
# notifications/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
import uuid

User = get_user_model()

class NotificationType(models.TextChoices):
    APPLICATION_SUBMITTED = 'app_submitted', 'Application Submitted'
    APPLICATION_APPROVED = 'app_approved', 'Application Approved'
    APPLICATION_REJECTED = 'app_rejected', 'Application Rejected'
    SUPERVISOR_ASSIGNED = 'supervisor_assigned', 'Supervisor Assigned'
    DEPARTMENT_UPDATED = 'dept_updated', 'Department Updated'
    COURSE_ADDED = 'course_added', 'Course Added'
    INTERNSHIP_POSTED = 'internship_posted', 'Internship Posted'
    DEADLINE_REMINDER = 'deadline_reminder', 'Deadline Reminder'
    SYSTEM_ANNOUNCEMENT = 'system_announcement', 'System Announcement'

class NotificationPriority(models.TextChoices):
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'
    URGENT = 'urgent', 'Urgent'

class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')
    
    notification_type = models.CharField(max_length=50, choices=NotificationType.choices)
    priority = models.CharField(max_length=10, choices=NotificationPriority.choices, default=NotificationPriority.MEDIUM)
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Generic foreign key for related objects
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    related_object = GenericForeignKey('content_type', 'object_id')
    
    # Delivery channels
    send_email = models.BooleanField(default=False)
    send_websocket = models.BooleanField(default=True)
    send_push = models.BooleanField(default=False)
    
    # Status tracking
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['is_read']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.recipient.username}"

class NotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Email preferences
    email_applications = models.BooleanField(default=True)
    email_assignments = models.BooleanField(default=True)
    email_deadlines = models.BooleanField(default=True)
    email_announcements = models.BooleanField(default=False)
    email_frequency = models.CharField(
        max_length=20,
        choices=[
            ('immediate', 'Immediate'),
            ('daily', 'Daily Digest'),
            ('weekly', 'Weekly Digest'),
        ],
        default='immediate'
    )
    
    # In-app preferences
    inapp_applications = models.BooleanField(default=True)
    inapp_assignments = models.BooleanField(default=True)
    inapp_deadlines = models.BooleanField(default=True)
    inapp_announcements = models.BooleanField(default=True)
    
    # Push notification preferences
    push_enabled = models.BooleanField(default=False)
    push_applications = models.BooleanField(default=True)
    push_urgent_only = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Preferences for {self.user.username}"
```

#### B. Notification Service

```python
# notifications/services.py
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
from typing import List, Optional, Dict, Any

from .models import Notification, NotificationType, NotificationPriority
from .tasks import send_email_notification, send_push_notification

User = get_user_model()
logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.channel_layer = get_channel_layer()
    
    def create_notification(
        self,
        recipients: List[User],
        notification_type: str,
        title: str,
        message: str,
        sender: Optional[User] = None,
        related_object: Optional[Any] = None,
        priority: str = NotificationPriority.MEDIUM,
        send_email: bool = None,
        send_websocket: bool = True,
        send_push: bool = None,
        metadata: Dict = None
    ) -> List[Notification]:
        """
        Create and send notifications to multiple recipients
        """
        notifications = []
        
        for recipient in recipients:
            # Get user preferences
            prefs = getattr(recipient, 'notification_preferences', None)
            
            # Determine delivery channels based on preferences
            if send_email is None:
                send_email = self._should_send_email(notification_type, prefs)
            if send_push is None:
                send_push = self._should_send_push(notification_type, prefs, priority)
            
            # Create notification
            notification = Notification.objects.create(
                recipient=recipient,
                sender=sender,
                notification_type=notification_type,
                priority=priority,
                title=title,
                message=message,
                content_type=ContentType.objects.get_for_model(related_object) if related_object else None,
                object_id=related_object.pk if related_object else None,
                send_email=send_email,
                send_websocket=send_websocket,
                send_push=send_push,
                metadata=metadata or {}
            )
            
            notifications.append(notification)
            
            # Send notifications
            self._deliver_notification(notification)
        
        return notifications
    
    def _deliver_notification(self, notification: Notification):
        """
        Deliver notification through configured channels
        """
        try:
            # Send WebSocket notification
            if notification.send_websocket:
                self._send_websocket_notification(notification)
            
            # Send email notification (async)
            if notification.send_email:
                send_email_notification.delay(notification.id)
            
            # Send push notification (async)
            if notification.send_push:
                send_push_notification.delay(notification.id)
                
        except Exception as e:
            logger.error(f"Failed to deliver notification {notification.id}: {str(e)}")
    
    def _send_websocket_notification(self, notification: Notification):
        """
        Send real-time notification via WebSocket
        """
        try:
            user_group = f"user_{notification.recipient.id}"
            
            async_to_sync(self.channel_layer.group_send)(
                user_group,
                {
                    'type': 'notification_message',
                    'notification': {
                        'id': str(notification.id),
                        'type': notification.notification_type,
                        'priority': notification.priority,
                        'title': notification.title,
                        'message': notification.message,
                        'created_at': notification.created_at.isoformat(),
                        'metadata': notification.metadata,
                        'related_object': {
                            'type': notification.content_type.model if notification.content_type else None,
                            'id': notification.object_id
                        } if notification.content_type else None
                    }
                }
            )
            
            notification.delivered_at = timezone.now()
            notification.save(update_fields=['delivered_at'])
            
        except Exception as e:
            logger.error(f"Failed to send WebSocket notification {notification.id}: {str(e)}")
    
    def _should_send_email(self, notification_type: str, prefs) -> bool:
        """
        Determine if email should be sent based on user preferences
        """
        if not prefs:
            return True  # Default to sending email if no preferences set
        
        type_mapping = {
            NotificationType.APPLICATION_SUBMITTED: prefs.email_applications,
            NotificationType.APPLICATION_APPROVED: prefs.email_applications,
            NotificationType.APPLICATION_REJECTED: prefs.email_applications,
            NotificationType.SUPERVISOR_ASSIGNED: prefs.email_assignments,
            NotificationType.DEADLINE_REMINDER: prefs.email_deadlines,
            NotificationType.SYSTEM_ANNOUNCEMENT: prefs.email_announcements,
        }
        
        return type_mapping.get(notification_type, True)
    
    def _should_send_push(self, notification_type: str, prefs, priority: str) -> bool:
        """
        Determine if push notification should be sent
        """
        if not prefs or not prefs.push_enabled:
            return False
        
        if prefs.push_urgent_only and priority != NotificationPriority.URGENT:
            return False
        
        type_mapping = {
            NotificationType.APPLICATION_SUBMITTED: prefs.push_applications,
            NotificationType.APPLICATION_APPROVED: prefs.push_applications,
            NotificationType.APPLICATION_REJECTED: prefs.push_applications,
        }
        
        return type_mapping.get(notification_type, False)

# Workflow-specific notification functions
def notify_application_status_change(application, old_status, new_status):
    """
    Notify relevant users about application status changes
    """
    service = NotificationService()
    
    # Notify student
    if new_status == 'approved':
        service.create_notification(
            recipients=[application.student.user],
            notification_type=NotificationType.APPLICATION_APPROVED,
            title="Application Approved!",
            message=f"Your application for {application.internship.title} has been approved.",
            related_object=application,
            priority=NotificationPriority.HIGH,
            send_email=True
        )
    elif new_status == 'rejected':
        service.create_notification(
            recipients=[application.student.user],
            notification_type=NotificationType.APPLICATION_REJECTED,
            title="Application Update",
            message=f"Your application for {application.internship.title} has been reviewed.",
            related_object=application,
            priority=NotificationPriority.MEDIUM,
            send_email=True
        )
    
    # Notify supervisors and admin
    supervisors = application.internship.department.supervisors.all()
    admin_users = User.objects.filter(role='institution_admin', institution=application.internship.institution)
    
    for user in list(supervisors) + list(admin_users):
        service.create_notification(
            recipients=[user],
            notification_type=NotificationType.APPLICATION_SUBMITTED,
            title="Application Status Updated",
            message=f"Application for {application.internship.title} status changed to {new_status}",
            related_object=application,
            priority=NotificationPriority.MEDIUM
        )

def notify_supervisor_assignment(supervisor, department, assigned_by):
    """
    Notify about supervisor assignments
    """
    service = NotificationService()
    
    # Notify the supervisor
    service.create_notification(
        recipients=[supervisor.user],
        notification_type=NotificationType.SUPERVISOR_ASSIGNED,
        title="New Department Assignment",
        message=f"You have been assigned to supervise {department.name} department.",
        sender=assigned_by,
        related_object=department,
        priority=NotificationPriority.HIGH,
        send_email=True
    )
    
    # Notify department admin
    admin_users = User.objects.filter(role='institution_admin', institution=department.institution)
    service.create_notification(
        recipients=admin_users,
        notification_type=NotificationType.SUPERVISOR_ASSIGNED,
        title="Supervisor Assigned",
        message=f"{supervisor.user.get_full_name()} has been assigned to {department.name}",
        sender=assigned_by,
        related_object=department,
        priority=NotificationPriority.MEDIUM
    )
```

### 3. WebSocket Consumer Implementation

```python
# notifications/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

User = get_user_model()

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if isinstance(self.user, AnonymousUser):
            await self.close()
            return
        
        self.user_group_name = f"user_{self.user.id}"
        
        # Join user-specific group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send unread notification count on connect
        unread_count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            'type': 'unread_count',
            'count': unread_count
        }))
    
    async def disconnect(self, close_code):
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'mark_read':
                notification_id = data.get('notification_id')
                await self.mark_notification_read(notification_id)
            elif message_type == 'mark_all_read':
                await self.mark_all_notifications_read()
            elif message_type == 'get_notifications':
                page = data.get('page', 1)
                notifications = await self.get_notifications(page)
                await self.send(text_data=json.dumps({
                    'type': 'notifications_list',
                    'notifications': notifications
                }))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
    
    async def notification_message(self, event):
        """
        Handle notification messages from the group
        """
        await self.send(text_data=json.dumps({
            'type': 'new_notification',
            'notification': event['notification']
        }))
    
    @database_sync_to_async
    def get_unread_count(self):
        from .models import Notification
        return Notification.objects.filter(
            recipient=self.user,
            is_read=False
        ).count()
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        from .models import Notification
        from django.utils import timezone
        
        try:
            notification = Notification.objects.get(
                id=notification_id,
                recipient=self.user
            )
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
            return True
        except Notification.DoesNotExist:
            return False
    
    @database_sync_to_async
    def mark_all_notifications_read(self):
        from .models import Notification
        from django.utils import timezone
        
        Notification.objects.filter(
            recipient=self.user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
    
    @database_sync_to_async
    def get_notifications(self, page=1, per_page=20):
        from .models import Notification
        
        offset = (page - 1) * per_page
        notifications = Notification.objects.filter(
            recipient=self.user
        ).order_by('-created_at')[offset:offset + per_page]
        
        return [{
            'id': str(n.id),
            'type': n.notification_type,
            'priority': n.priority,
            'title': n.title,
            'message': n.message,
            'is_read': n.is_read,
            'created_at': n.created_at.isoformat(),
            'metadata': n.metadata
        } for n in notifications]
```

### 4. Frontend JavaScript Implementation

```javascript
// js/notifications.js
class NotificationManager {
    constructor() {
        this.socket = null;
        this.notifications = [];
        this.unreadCount = 0;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.init();
    }
    
    init() {
        this.connectWebSocket();
        this.setupUI();
        this.bindEvents();
    }
    
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/notifications/`;
        
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = (event) => {
            console.log('Notification WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateConnectionStatus(true);
        };
        
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.socket.onclose = (event) => {
            console.log('Notification WebSocket disconnected');
            this.isConnected = false;
            this.updateConnectionStatus(false);
            this.attemptReconnect();
        };
        
        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'new_notification':
                this.addNotification(data.notification);
                break;
            case 'unread_count':
                this.updateUnreadCount(data.count);
                break;
            case 'notifications_list':
                this.loadNotifications(data.notifications);
                break;
            case 'error':
                console.error('Notification error:', data.message);
                break;
        }
    }
    
    addNotification(notification) {
        this.notifications.unshift(notification);
        this.unreadCount++;
        
        this.updateUnreadBadge();
        this.showToastNotification(notification);
        this.updateNotificationsList();
        
        // Play notification sound for high priority
        if (notification.priority === 'high' || notification.priority === 'urgent') {
            this.playNotificationSound();
        }
    }
    
    showToastNotification(notification) {
        const toast = document.createElement('div');
        toast.className = `notification-toast priority-${notification.priority}`;
        toast.innerHTML = `
            <div class="toast-header">
                <strong>${notification.title}</strong>
                <button type="button" class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    <span>&times;</span>
                </button>
            </div>
            <div class="toast-body">
                ${notification.message}
            </div>
        `;
        
        const container = document.getElementById('toast-container') || this.createToastContainer();
        container.appendChild(toast);
        
        // Auto-remove after 5 seconds for non-urgent notifications
        if (notification.priority !== 'urgent') {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 5000);
        }
    }
    
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }
    
    updateUnreadCount(count) {
        this.unreadCount = count;
        this.updateUnreadBadge();
    }
    
    updateUnreadBadge() {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'inline' : 'none';
        }
    }
    
    markAsRead(notificationId) {
        if (this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'mark_read',
                notification_id: notificationId
            }));
        }
        
        // Update local state
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.is_read) {
            notification.is_read = true;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.updateUnreadBadge();
        }
    }
    
    markAllAsRead() {
        if (this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'mark_all_read'
            }));
        }
        
        // Update local state
        this.notifications.forEach(n => n.is_read = true);
        this.unreadCount = 0;
        this.updateUnreadBadge();
        this.updateNotificationsList();
    }
    
    loadNotifications(page = 1) {
        if (this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'get_notifications',
                page: page
            }));
        }
    }
    
    setupUI() {
        // Create notification center HTML
        const notificationHTML = `
            <div id="notification-center" class="notification-center hidden">
                <div class="notification-header">
                    <h3>Notifications</h3>
                    <div class="notification-actions">
                        <button id="mark-all-read" class="btn btn-sm">Mark All Read</button>
                        <button id="close-notifications" class="btn btn-sm">&times;</button>
                    </div>
                </div>
                <div id="notifications-list" class="notifications-list">
                    <!-- Notifications will be loaded here -->
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', notificationHTML);
    }
    
    bindEvents() {
        // Notification bell click
        document.addEventListener('click', (e) => {
            if (e.target.matches('#notification-bell')) {
                this.toggleNotificationCenter();
            }
        });
        
        // Mark all as read
        document.addEventListener('click', (e) => {
            if (e.target.matches('#mark-all-read')) {
                this.markAllAsRead();
            }
        });
        
        // Close notification center
        document.addEventListener('click', (e) => {
            if (e.target.matches('#close-notifications')) {
                this.hideNotificationCenter();
            }
        });
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            const center = document.getElementById('notification-center');
            const bell = document.getElementById('notification-bell');
            
            if (center && !center.contains(e.target) && !bell.contains(e.target)) {
                this.hideNotificationCenter();
            }
        });
    }
    
    toggleNotificationCenter() {
        const center = document.getElementById('notification-center');
        if (center.classList.contains('hidden')) {
            this.showNotificationCenter();
        } else {
            this.hideNotificationCenter();
        }
    }
    
    showNotificationCenter() {
        const center = document.getElementById('notification-center');
        center.classList.remove('hidden');
        this.loadNotifications(1);
    }
    
    hideNotificationCenter() {
        const center = document.getElementById('notification-center');
        center.classList.add('hidden');
    }
    
    updateNotificationsList() {
        const list = document.getElementById('notifications-list');
        if (!list) return;
        
        if (this.notifications.length === 0) {
            list.innerHTML = '<div class="no-notifications">No notifications</div>';
            return;
        }
        
        list.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.is_read ? 'read' : 'unread'}" 
                 data-id="${notification.id}" 
                 onclick="notificationManager.markAsRead('${notification.id}')">
                <div class="notification-priority priority-${notification.priority}"></div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${this.formatTime(notification.created_at)}</div>
                </div>
            </div>
        `).join('');
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }
    
    playNotificationSound() {
        // Create and play notification sound
        const audio = new Audio('/static/sounds/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Could not play notification sound'));
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
            
            setTimeout(() => {
                console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                this.connectWebSocket();
            }, delay);
        }
    }
    
    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connection-indicator');
        if (indicator) {
            indicator.className = connected ? 'connected' : 'disconnected';
            indicator.title = connected ? 'Connected' : 'Disconnected';
        }
    }
}

// Initialize notification manager
const notificationManager = new NotificationManager();

// Export for global access
window.notificationManager = notificationManager;
```

### 5. CSS Styles

```css
/* notifications.css */
.notification-center {
    position: fixed;
    top: 60px;
    right: 20px;
    width: 400px;
    max-height: 600px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    overflow: hidden;
}

.notification-center.hidden {
    display: none;
}

.notification-header {
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f9fafb;
}

.notification-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
}

.notification-actions {
    display: flex;
    gap: 8px;
}

.notifications-list {
    max-height: 500px;
    overflow-y: auto;
}

.notification-item {
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
    cursor: pointer;
    display: flex;
    gap: 12px;
    transition: background-color 0.2s;
}

.notification-item:hover {
    background-color: #f9fafb;
}

.notification-item.unread {
    background-color: #eff6ff;
    border-left: 4px solid #3b82f6;
}

.notification-priority {
    width: 4px;
    border-radius: 2px;
    flex-shrink: 0;
}

.priority-low {
    background-color: #10b981;
}

.priority-medium {
    background-color: #f59e0b;
}

.priority-high {
    background-color: #ef4444;
}

.priority-urgent {
    background-color: #dc2626;
    animation: pulse 2s infinite;
}

.notification-content {
    flex: 1;
}

.notification-title {
    font-weight: 600;
    margin-bottom: 4px;
    color: #111827;
}

.notification-message {
    color: #6b7280;
    font-size: 14px;
    margin-bottom: 8px;
    line-height: 1.4;
}

.notification-time {
    font-size: 12px;
    color: #9ca3af;
}

.no-notifications {
    padding: 40px 16px;
    text-align: center;
    color: #6b7280;
}

/* Toast notifications */
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1050;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.notification-toast {
    min-width: 300px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
    animation: slideIn 0.3s ease-out;
}

.notification-toast.priority-urgent {
    border-left: 4px solid #dc2626;
}

.notification-toast.priority-high {
    border-left: 4px solid #ef4444;
}

.notification-toast.priority-medium {
    border-left: 4px solid #f59e0b;
}

.notification-toast.priority-low {
    border-left: 4px solid #10b981;
}

.toast-header {
    padding: 12px 16px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.toast-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.toast-close:hover {
    color: #374151;
}

.toast-body {
    padding: 12px 16px;
    color: #6b7280;
    font-size: 14px;
}

/* Notification badge */
#notification-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #ef4444;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
}

/* Connection indicator */
#connection-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-left: 8px;
}

#connection-indicator.connected {
    background-color: #10b981;
}

#connection-indicator.disconnected {
    background-color: #ef4444;
}

/* Animations */
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    .notification-center {
        background: #1f2937;
        color: #f9fafb;
    }
    
    .notification-header {
        background: #374151;
        border-bottom-color: #4b5563;
    }
    
    .notification-item {
        border-bottom-color: #4b5563;
    }
    
    .notification-item:hover {
        background-color: #374151;
    }
    
    .notification-item.unread {
        background-color: #1e3a8a;
    }
    
    .notification-toast {
        background: #1f2937;
        color: #f9fafb;
    }
    
    .toast-header {
        background: #374151;
        border-bottom-color: #4b5563;
    }
}
```

## Integration Points

### 1. Django Signals Integration

```python
# signals.py
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .services import notify_application_status_change, notify_supervisor_assignment

@receiver(post_save, sender='internship.Application')
def application_status_changed(sender, instance, created, **kwargs):
    if not created and hasattr(instance, '_old_status'):
        if instance.status != instance._old_status:
            notify_application_status_change(
                instance, 
                instance._old_status, 
                instance.status
            )

@receiver(pre_save, sender='internship.Application')
def store_old_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = sender.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except sender.DoesNotExist:
            instance._old_status = None
```

### 2. API Endpoints

```python
# notifications/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

class NotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        return Response({'status': 'marked as read'})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'status': 'all marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})
```

## Performance Considerations

1. **Database Optimization**
   - Proper indexing on notification queries
   - Pagination for notification lists
   - Cleanup of old notifications

2. **WebSocket Scaling**
   - Redis channel layer for multi-server deployments
   - Connection pooling and management
   - Rate limiting for notification sending

3. **Caching Strategy**
   - Cache unread counts
   - Cache user preferences
   - Cache notification templates

## Security Measures

1. **Authentication**
   - WebSocket authentication via JWT tokens
   - User isolation in notification groups
   - Permission checks for notification access

2. **Rate Limiting**
   - Limit notification creation per user
   - Prevent spam notifications
   - WebSocket connection limits

3. **Data Validation**
   - Sanitize notification content
   - Validate notification types
   - Secure email template rendering

## Deployment Configuration

1. **Redis Setup** (for WebSocket scaling)
2. **Celery Configuration** (for async email/push notifications)
3. **Email Service Integration** (SendGrid, AWS SES, etc.)
4. **Push Notification Service** (Firebase, OneSignal, etc.)

This comprehensive notification system provides real-time updates, email notifications, and in-app messaging while maintaining performance and security standards for the EduLink platform.