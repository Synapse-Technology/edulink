# Phase 3 Implementation Guide: Communication & Transparency

**Target**: 4-week sprint for messaging, notifications, and status tracking  
**Priority**: Critical path for student retention and platform success

---

## Overview: Phase 3 Features

```
Phase 3 consists of 4 interconnected features:

┌─────────────────────────────────────────────────┐
│ 1. Unified Messaging System                     │
│    └─ Real-time conversations with employers   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 2. Notification Hub                             │
│    └─ In-app bell + notification settings      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 3. Application Status Timeline                  │
│    └─ Expected timeline + next steps           │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│ 4. WebSocket Real-time Updates                  │
│    └─ Underlying infrastructure for 1-3        │
└─────────────────────────────────────────────────┘
```

---

## Feature #1: Unified Messaging System

### Backend Implementation

#### 1.1 Data Models

```python
# conversations/models.py

class Conversation(models.Model):
    """Represents a thread of messages between student and employer"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    # Participants
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE)
    
    # Context (why this conversation exists)
    application = models.OneToOneField(
        InternshipApplication, 
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    # Meta
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    student_read_at = models.DateTimeField(null=True)
    employer_read_at = models.DateTimeField(null=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['student', 'created_at']),
            models.Index(fields=['employer', 'created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'employer', 'application'],
                name='unique_conversation_per_application'
            )
        ]
    
    def unread_count_for_student(self):
        """Count unread messages for this student"""
        return self.messages.filter(
            sender_type='employer',
            read_at__isnull=True
        ).count()


class Message(models.Model):
    """Individual message in a conversation"""
    
    SENDER_CHOICES = [('student', 'Student'), ('employer', 'Employer')]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE,
        related_name='messages'
    )
    
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    sender_type = models.CharField(max_length=10, choices=SENDER_CHOICES)
    
    content = models.TextField(max_length=5000)
    attachments = models.JSONField(default=list)  # [{'name': '...', 'url': '...'}]
    
    # For automation (system messages like "Status changed")
    message_type = models.CharField(
        max_length=20,
        choices=[
            ('USER', 'User message'),
            ('STATUS_UPDATE', 'Automatic status update'),
            ('DOCUMENT_REQUEST', 'Automatic document request'),
            ('INTERVIEW_SCHEDULED', 'Automatic interview notification'),
        ],
        default='USER'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', '-created_at']),
        ]
```

#### 1.2 API Endpoints

```python
# conversations/views.py

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class ConversationViewSet(viewsets.ModelViewSet):
    """
    /api/conversations/
    GET     - List user's conversations
    POST    - Create conversation
    GET /:id - Get conversation detail with messages
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer
    
    def get_queryset(self):
        user = self.request.user
        # Students see their conversations
        if user.role == 'student':
            return Conversation.objects.filter(student__user=user)
        # Employers see their conversations
        elif user.role == 'employer':
            return Conversation.objects.filter(employer__user=user)
        return Conversation.objects.none()
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get all messages in conversation"""
        conversation = self.get_object()
        messages = conversation.messages.all()
        serializer = MessageSerializer(messages, many=True)
        
        # Mark as read
        user = request.user
        if user.role == 'student' and conversation.student.user == user:
            Message.objects.filter(
                conversation=conversation,
                sender_type='employer',
                read_at__isnull=True
            ).update(read_at=now())
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send message in conversation"""
        conversation = self.get_object()
        
        serializer = MessageSerializer(
            data=request.data,
            context={'conversation': conversation, 'user': request.user}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Broadcast via WebSocket
        notify_conversation_update(conversation, serializer.data)
        
        return Response(serializer.data, status=201)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get total unread message count"""
        conversations = self.get_queryset()
        total = 0
        for conv in conversations:
            total += conv.unread_count_for_student()
        return Response({'unread': total})
```

### Frontend Implementation

#### 1.3 Store (Zustand)

```typescript
// stores/messaging.store.ts

interface Conversation {
  id: string;
  student_name: string;
  employer_name: string;
  last_message: string;
  unread_count: number;
  last_message_at: string;
}

interface Message {
  id: string;
  sender: 'student' | 'employer';
  sender_name: string;
  content: string;
  created_at: string;
  read_at?: string;
  attachments: { name: string; url: string }[];
}

interface MessagingState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Record<string, Message[]>;  // By conversation ID
  loading: boolean;
  unreadCount: number;
  
  // Actions
  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  markAsRead: (conversationId: string) => Promise<void>;
}

export const useMessagingStore = create<MessagingState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: {},
  loading: false,
  unreadCount: 0,
  
  loadConversations: async () => {
    set({ loading: true });
    try {
      const data = await messagesService.getConversations();
      const unreadCount = await messagesService.getUnreadCount();
      set({ 
        conversations: data,
        unreadCount,
      });
    } finally {
      set({ loading: false });
    }
  },
  
  selectConversation: async (id: string) => {
    set({ currentConversationId: id });
    try {
      const messages = await messagesService.getMessages(id);
      set((state) => ({
        messages: { ...state.messages, [id]: messages },
      }));
      // Mark as read
      await messagesService.markConversationRead(id);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  },
  
  sendMessage: async (conversationId: string, content: string) => {
    try {
      const message = await messagesService.sendMessage(conversationId, content);
      // Optimistically add to UI
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: [
            ...(state.messages[conversationId] || []),
            message,
          ],
        },
      }));
    } catch (error) {
      showToast.error('Failed to send message');
    }
  },
  
  markAsRead: async (conversationId: string) => {
    await messagesService.markConversationRead(conversationId);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ),
    }));
  },
}));
```

#### 1.4 Components

```typescript
// components/messaging/ConversationList.tsx

export const ConversationList: React.FC = () => {
  const { conversations, selectConversation, currentConversationId } = useMessagingStore();
  
  return (
    <div className="conversation-list">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          className={`conversation-item ${
            currentConversationId === conv.id ? 'active' : ''
          }`}
          onClick={() => selectConversation(conv.id)}
        >
          <div className="flex-grow">
            <h4>{conv.employer_name}</h4>
            <p className="truncate text-muted">{conv.last_message}</p>
            <small className="text-muted">
              {formatTimeAgo(conv.last_message_at)}
            </small>
          </div>
          
          {conv.unread_count > 0 && (
            <badge className="badge bg-primary rounded-pill">
              {conv.unread_count}
            </badge>
          )}
        </div>
      ))}
      
      {conversations.length === 0 && (
        <div className="text-center py-5 text-muted">
          <MessageSquare size={32} className="mb-2" />
          <p>No messages yet</p>
        </div>
      )}
    </div>
  );
};

// components/messaging/MessageThread.tsx

export const MessageThread: React.FC<{ conversationId: string }> = ({ conversationId }) => {
  const { messages, sendMessage, unreadCount } = useMessagingStore();
  const [draftMessage, setDraftMessage] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Auto-scroll to bottom
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[conversationId]]);
  
  const currentMessages = messages[conversationId] || [];
  
  const handleSend = async () => {
    if (!draftMessage.trim()) return;
    await sendMessage(conversationId, draftMessage);
    setDraftMessage('');
  };
  
  return (
    <div className="message-thread d-flex flex-column">
      {/* Messages */}
      <div className="flex-grow-1 overflow-auto p-3">
        {currentMessages.map((msg) => (
          <div
            key={msg.id}
            className={`message mb-3 ${
              msg.sender === 'student' ? 'text-end' : 'text-start'
            }`}
          >
            <div
              className={`badge ${
                msg.sender === 'student' ? 'bg-primary' : 'bg-secondary'
              } p-2 mb-1 d-inline-block`}
            >
              {msg.content}
            </div>
            <div className="small text-muted">
              {formatTime(msg.created_at)}
              {msg.read_at && ' ✓✓'}
            </div>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>
      
      {/* Compose */}
      <div className="border-top p-3">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Type a message..."
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!draftMessage.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## Feature #2: Notification System

### Backend

```python
# notifications/models.py

class Notification(models.Model):
    TYPE_CHOICES = [
        ('APPLICATION_STATUS_CHANGED', 'Application Status Changed'),
        ('MESSAGE_RECEIVED', 'New Message'),
        ('FEEDBACK_AVAILABLE', 'Feedback Available'),
        ('DOCUMENT_REQUEST', 'Document Requested'),
        ('INTERVIEW_SCHEDULED', 'Interview Scheduled'),
        ('RATE_LIMIT_WARNING', 'Rate Limit Warning'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    
    recipient = models.ForeignKey(Student, on_delete=models.CASCADE)
    
    notification_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Context for deep linking
    target_url = models.CharField(max_length=500, blank=True)
    metadata = models.JSONField(default=dict)  # {application_id: '...', status: '...'}
    
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True)
    
    # Delivery
    email_sent = models.BooleanField(default=False)
    pushed_to_websocket = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
        ]
```

### Frontend

```typescript
// stores/notifications.store.ts

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  target_url?: string;
  created_at: string;
  read_at?: string;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
      unreadCount: notification.read_at ? state.unreadCount : state.unreadCount + 1,
    })),
  
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        read_at: n.read_at || new Date().toISOString(),
      })),
      unreadCount: 0,
    })),
  
  deleteNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));

// components/NotificationBell.tsx

export const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead } = useNotificationsStore();
  const [open, setOpen] = useState(false);
  
  return (
    <div className="notification-bell">
      <button
        className="btn btn-link position-relative"
        onClick={() => setOpen(!open)}
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {open && (
        <div className="notification-dropdown card shadow-lg">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5>Notifications</h5>
            {unreadCount > 0 && (
              <button className="btn btn-sm btn-link" onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="list-group list-group-flush" style={{ maxHeight: '400px', overflow: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="p-3 text-center text-muted">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <a
                  key={notif.id}
                  href={notif.target_url || '#'}
                  className={`list-group-item list-group-item-action ${
                    !notif.read_at ? 'bg-light' : ''
                  }`}
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.target_url) window.location.href = notif.target_url;
                  }}
                >
                  <strong>{notif.title}</strong>
                  <p className="mb-0 small text-muted">{notif.message}</p>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## Feature #3: Status Timeline

```typescript
// components/student/ApplicationStatusTimeline.tsx

export const ApplicationStatusTimeline: React.FC<{ application: InternshipApplication }> = ({
  application,
}) => {
  const timeline = [
    {
      status: 'SUBMITTED',
      label: 'Application Submitted',
      icon: CheckCircle,
      timestamp: application.created_at,
      completed: true,
    },
    {
      status: 'UNDER_REVIEW',
      label: 'Under Review',
      icon: Clock,
      timestamp: null,  // Not yet
      completed: application.status !== 'SUBMITTED',
      duration: '5-10 business days',
    },
    {
      status: 'SHORTLISTED',
      label: 'Interview Scheduled',
      icon: MessageSquare,
      timestamp: application.interview_date,
      completed: ['SHORTLISTED', 'INTERVIEW', 'ACCEPTED', 'ACTIVE'].includes(application.status),
    },
    {
      status: 'OFFER_EXTENDED',
      label: 'Offer Extended',
      icon: Gift,
      timestamp: application.offer_date,
      completed: ['ACCEPTED', 'ACTIVE'].includes(application.status),
    },
    {
      status: 'ACTIVE',
      label: 'Internship Ongoing',
      icon: Briefcase,
      timestamp: application.start_date,
      completed: ['ACTIVE', 'COMPLETED', 'CERTIFIED'].includes(application.status),
    },
    {
      status: 'CERTIFIED',
      label: 'Certification Complete',
      icon: Award,
      timestamp: application.completion_date,
      completed: application.status === 'CERTIFIED',
    },
  ];
  
  return (
    <div className="status-timeline">
      {timeline.map((item, index) => {
        const Icon = item.icon;
        const isLast = index === timeline.length - 1;
        
        return (
          <div key={item.status} className="timeline-item mb-4">
            <div className="d-flex">
              {/* Left: Icon */}
              <div className="timeline-icon text-center">
                <Icon
                  size={24}
                  className={item.completed ? 'text-success' : 'text-muted'}
                  fill={item.completed ? 'currentColor' : 'none'}
                />
              </div>
              
              {/* Line to next item */}
              {!isLast && (
                <div
                  className={`timeline-line ${item.completed ? 'bg-success' : 'bg-light'}`}
                />
              )}
              
              {/* Right: Content */}
              <div className="timeline-content ms-3">
                <h5>{item.label}</h5>
                {item.timestamp && (
                  <small className="text-muted">
                    {formatDate(item.timestamp)}
                  </small>
                )}
                {item.duration && !item.timestamp && (
                  <small className="text-warning">Expected: {item.duration}</small>
                )}
                {!item.completed && item.status === application.status && (
                  <p className="small text-info mb-0">
                    💡 You're here now. Next step will appear when employer reviews.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

---

## Feature #4: WebSocket Integration

### Backend (Django Channels)

```python
# messaging/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class StudentConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time student updates"""
    
    async def connect(self):
        self.user = self.scope['user']
        
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Subscribe to student-specific channel
        self.group_name = f'student_{self.user.id}'
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'mark_read':
            # Handle mark as read
            await self.mark_conversation_read(data['conversation_id'])
    
    # When backend broadcasts to the group, this method is called
    async def notification_update(self, event):
        """Send message to WebSocket"""
        await self.send(text_data=json.dumps(event['message']))
    
    async def application_status_update(self, event):
        """Send application status update to WebSocket"""
        await self.send(text_data=json.dumps(event['data']))
    
    @database_sync_to_async
    def mark_conversation_read(self, conversation_id):
        from conversations.models import Message
        Message.objects.filter(
            conversation_id=conversation_id,
            sender_type='employer',
            read_at__isnull=True
        ).update(read_at=now())
```

### Frontend (Subscription Service)

```typescript
// services/websocket/studentSubscriptions.ts

class StudentSubscriptionService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval = 3000;
  private shouldReconnect = true;
  
  constructor() {
    this.url = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${
      window.location.host
    }/ws/student/`;
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.addConnectionStatusListener();
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectInterval);
      }
    };
  }
  
  private handleMessage(message: any) {
    const { type } = message;
    
    switch (type) {
      case 'notification_update':
        this.handleNotification(message);
        break;
      case 'application_status_update':
        this.handleApplicationUpdate(message);
        break;
      case 'new_message':
        this.handleNewMessage(message);
        break;
      default:
        console.warn('Unknown message type:', type);
    }
  }
  
  private handleNotification(data: any) {
    const { useNotificationsStore } = require('@/stores');
    const store = useNotificationsStore.getState();
    store.addNotification(data.notification);
  }
  
  private handleApplicationUpdate(data: any) {
    const { useStudentStore } = require('@/stores');
    const store = useStudentStore.getState();
    store.updateApplication(data.application);
    
    // Show toast
    showToast.info(`Status: ${data.application.status}`);
  }
  
  private handleNewMessage(data: any) {
    const { useMessagingStore } = require('@/stores');
    const store = useMessagingStore.getState();
    store.addMessageToConversation(data.message);
  }
  
  disconnect() {
    this.shouldReconnect = false;
    this.ws?.close();
  }
}

export const studentSubscriptions = new StudentSubscriptionService();
```

---

## 4-Week Implementation Timeline

```
Week 1: Foundations
  ├─ Day 1-2: Set up Django Channels + WebSocket
  ├─ Day 3-4: Create Message/Conversation models + migrations
  ├─ Day 5: Implement messaging API endpoints
  └─ Dev: 16 hours, QA: 4 hours

Week 2: Messaging UI & Real-time
  ├─ Day 1-2: Build MessageList + MessageThread components
  ├─ Day 3: Implement WebSocket client service
  ├─ Day 4: Connect store to WebSocket
  ├─ Day 5: End-to-end tests
  └─ Dev: 20 hours, QA: 8 hours

Week 3: Notifications & Timeline
  ├─ Day 1-2: Build Notification models + API
  ├─ Day 3: Create NotificationBell component
  ├─ Day 4-5: Build StatusTimeline component + integration
  └─ Dev: 16 hours, QA: 6 hours

Week 4: Polish & Performance
  ├─ Day 1-2: Bug fixes from user testing
  ├─ Day 3: Performance optimization (WebSocket batching)
  ├─ Day 4: Mobile responsiveness
  ├─ Day 5: Documentation + team handoff
  └─ Dev: 12 hours, QA: 8 hours

Total: ~88 dev hours + ~26 QA hours = ~114 hours (2-3 person-weeks)
```

---

## Success Criteria

```
✅ Messaging:
  - Student can send message to employer in < 2 seconds
  - Messages appear in real-time (< 100ms latency)
  - Unread count badge updates instantly
  - Mobile responsive

✅ Notifications:
  - In-app notification appears < 1 second after event
  - Bell badge updates instantly
  - Can open notification to see full content
  - 0 false notifications

✅ Timeline:
  - Shows expected next steps
  - Updates when status changes
  - Mobile responsive
  - Load time < 2 seconds

✅ WebSocket:
  - Maintains connection during inactivity
  - Auto-reconnects on disconnect
  - Handles 1000+ concurrent connections
  - No memory leaks after 24h uptime

✅ User Acceptance:
  - 80%+ of students used messaging
  - Average message response time < 1 hour
  - Student satisfaction > 4.0/5.0
```

---

This Phase 3 implementation will **transform the student experience** from email-only communication to real-time, transparent, engaging platform interaction.
