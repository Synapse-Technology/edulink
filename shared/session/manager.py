"""Distributed Session Manager.

Provides session management capabilities for microservices with support for
Redis-based distributed sessions and JWT token validation.
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from enum import Enum

import redis
import jwt
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os


class SessionStatus(Enum):
    """Session status enumeration."""
    ACTIVE = "active"
    EXPIRED = "expired"
    TERMINATED = "terminated"
    SUSPENDED = "suspended"


@dataclass
class SessionData:
    """Session data structure."""
    session_id: str
    user_id: str
    ip_address: str
    user_agent: str
    device_type: str
    location: Optional[str]
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    status: SessionStatus
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        data = asdict(self)
        # Convert datetime objects to ISO format
        data['created_at'] = self.created_at.isoformat()
        data['last_activity'] = self.last_activity.isoformat()
        data['expires_at'] = self.expires_at.isoformat()
        data['status'] = self.status.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SessionData':
        """Create from dictionary."""
        return cls(
            session_id=data['session_id'],
            user_id=data['user_id'],
            ip_address=data['ip_address'],
            user_agent=data['user_agent'],
            device_type=data['device_type'],
            location=data.get('location'),
            created_at=datetime.fromisoformat(data['created_at']),
            last_activity=datetime.fromisoformat(data['last_activity']),
            expires_at=datetime.fromisoformat(data['expires_at']),
            status=SessionStatus(data['status']),
            metadata=data.get('metadata', {})
        )
    
    def is_expired(self) -> bool:
        """Check if session is expired."""
        return datetime.utcnow() > self.expires_at
    
    def is_active(self) -> bool:
        """Check if session is active."""
        return self.status == SessionStatus.ACTIVE and not self.is_expired()
    
    def extend(self, duration: timedelta) -> None:
        """Extend session expiration."""
        self.expires_at = datetime.utcnow() + duration
        self.last_activity = datetime.utcnow()


@dataclass
class TokenData:
    """JWT token data structure."""
    token: str
    token_type: str
    user_id: str
    session_id: Optional[str]
    scopes: List[str]
    issued_at: datetime
    expires_at: datetime
    metadata: Dict[str, Any]
    
    def is_expired(self) -> bool:
        """Check if token is expired."""
        return datetime.utcnow() > self.expires_at


class SessionManagerInterface(ABC):
    """Abstract interface for session management."""
    
    @abstractmethod
    async def create_session(self, user_id: str, ip_address: str, 
                           user_agent: str, device_type: str = "web",
                           location: str = None, duration: timedelta = None,
                           metadata: Dict[str, Any] = None) -> SessionData:
        """Create a new session."""
        pass
    
    @abstractmethod
    async def get_session(self, session_id: str) -> Optional[SessionData]:
        """Get session by ID."""
        pass
    
    @abstractmethod
    async def update_session(self, session_id: str, 
                           last_activity: datetime = None,
                           metadata: Dict[str, Any] = None) -> bool:
        """Update session activity and metadata."""
        pass
    
    @abstractmethod
    async def extend_session(self, session_id: str, 
                           duration: timedelta) -> bool:
        """Extend session expiration."""
        pass
    
    @abstractmethod
    async def terminate_session(self, session_id: str) -> bool:
        """Terminate a session."""
        pass
    
    @abstractmethod
    async def get_user_sessions(self, user_id: str, 
                              active_only: bool = True) -> List[SessionData]:
        """Get all sessions for a user."""
        pass
    
    @abstractmethod
    async def terminate_user_sessions(self, user_id: str, 
                                    exclude_session: str = None) -> int:
        """Terminate all sessions for a user."""
        pass
    
    @abstractmethod
    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions."""
        pass
    
    
    @abstractmethod
    async def generate_token(self, user_id: str, session_id: str = None,
                           token_type: str = "access", scopes: List[str] = None,
                           duration: timedelta = None) -> TokenData:
        """Generate a JWT token."""
        pass
    
    @abstractmethod
    async def validate_token(self, token: str) -> Optional[TokenData]:
        """Validate a JWT token."""
        pass
    
    @abstractmethod
    async def revoke_token(self, token: str) -> bool:
        """Revoke a token."""
        pass


class RedisSessionManager(SessionManagerInterface):
    """Redis-based session manager implementation."""
    
    def __init__(self, redis_url: str, jwt_secret: str, 
                 default_session_duration: timedelta = timedelta(hours=24),
                 default_token_duration: timedelta = timedelta(hours=1)):
        """Initialize Redis session manager."""
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.jwt_secret = jwt_secret
        self.default_session_duration = default_session_duration
        self.default_token_duration = default_token_duration
        
        # Key prefixes
        self.session_prefix = "session:"
        self.user_sessions_prefix = "user_sessions:"
        self.token_blacklist_prefix = "token_blacklist:"
    
    def _session_key(self, session_id: str) -> str:
        """Generate Redis key for session."""
        return f"{self.session_prefix}{session_id}"
    
    def _user_sessions_key(self, user_id: str) -> str:
        """Generate Redis key for user sessions."""
        return f"{self.user_sessions_prefix}{user_id}"
    
    def _token_blacklist_key(self, token_id: str) -> str:
        """Generate Redis key for blacklisted token."""
        return f"{self.token_blacklist_prefix}{token_id}"
    
    async def create_session(self, user_id: str, ip_address: str, 
                           user_agent: str, device_type: str = "web",
                           location: str = None, duration: timedelta = None,
                           metadata: Dict[str, Any] = None) -> SessionData:
        """Create a new session."""
        session_id = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = now + (duration or self.default_session_duration)
        
        session = SessionData(
            session_id=session_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            device_type=device_type,
            location=location,
            created_at=now,
            last_activity=now,
            expires_at=expires_at,
            status=SessionStatus.ACTIVE,
            metadata=metadata or {}
        )
        
        # Store session data
        session_key = self._session_key(session_id)
        user_sessions_key = self._user_sessions_key(user_id)
        
        # Use pipeline for atomic operations
        pipe = self.redis_client.pipeline()
        
        # Store session
        pipe.setex(
            session_key,
            int(self.default_session_duration.total_seconds()),
            json.dumps(session.to_dict())
        )
        
        # Add to user sessions set
        pipe.sadd(user_sessions_key, session_id)
        pipe.expire(user_sessions_key, int(self.default_session_duration.total_seconds()))
        
        await pipe.execute()
        
        return session
    
    async def get_session(self, session_id: str) -> Optional[SessionData]:
        """Get session by ID."""
        session_key = self._session_key(session_id)
        session_data = await self.redis_client.get(session_key)
        
        if not session_data:
            return None
        
        try:
            data = json.loads(session_data)
            session = SessionData.from_dict(data)
            
            # Check if session is expired
            if session.is_expired():
                await self.terminate_session(session_id)
                return None
            
            return session
        except (json.JSONDecodeError, KeyError, ValueError):
            # Invalid session data, remove it
            await self.redis_client.delete(session_key)
            return None
    
    async def update_session(self, session_id: str, 
                           last_activity: datetime = None,
                           metadata: Dict[str, Any] = None) -> bool:
        """Update session activity and metadata."""
        session = await self.get_session(session_id)
        if not session:
            return False
        
        # Update session data
        if last_activity:
            session.last_activity = last_activity
        else:
            session.last_activity = datetime.utcnow()
        
        if metadata:
            session.metadata.update(metadata)
        
        # Store updated session
        session_key = self._session_key(session_id)
        await self.redis_client.setex(
            session_key,
            int((session.expires_at - datetime.utcnow()).total_seconds()),
            json.dumps(session.to_dict())
        )
        
        return True
    
    async def extend_session(self, session_id: str, 
                           duration: timedelta) -> bool:
        """Extend session expiration."""
        session = await self.get_session(session_id)
        if not session:
            return False
        
        session.extend(duration)
        
        # Store updated session
        session_key = self._session_key(session_id)
        await self.redis_client.setex(
            session_key,
            int(duration.total_seconds()),
            json.dumps(session.to_dict())
        )
        
        return True
    
    async def terminate_session(self, session_id: str) -> bool:
        """Terminate a session."""
        session = await self.get_session(session_id)
        if not session:
            return False
        
        # Remove from Redis
        session_key = self._session_key(session_id)
        user_sessions_key = self._user_sessions_key(session.user_id)
        
        pipe = self.redis_client.pipeline()
        pipe.delete(session_key)
        pipe.srem(user_sessions_key, session_id)
        await pipe.execute()
        
        return True
    
    async def get_user_sessions(self, user_id: str, 
                              active_only: bool = True) -> List[SessionData]:
        """Get all sessions for a user."""
        user_sessions_key = self._user_sessions_key(user_id)
        session_ids = await self.redis_client.smembers(user_sessions_key)
        
        sessions = []
        for session_id in session_ids:
            session = await self.get_session(session_id)
            if session:
                if not active_only or session.is_active():
                    sessions.append(session)
        
        return sessions
    
    async def terminate_user_sessions(self, user_id: str, 
                                    exclude_session: str = None) -> int:
        """Terminate all sessions for a user."""
        sessions = await self.get_user_sessions(user_id, active_only=False)
        terminated_count = 0
        
        for session in sessions:
            if exclude_session and session.session_id == exclude_session:
                continue
            
            if await self.terminate_session(session.session_id):
                terminated_count += 1
        
        return terminated_count
    
    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions."""
        # Redis automatically expires keys, but we need to clean up user session sets
        # This is a simplified implementation - in production, you might want to use
        # a more sophisticated approach with background tasks
        
        # Get all user session keys
        pattern = f"{self.user_sessions_prefix}*"
        keys = await self.redis_client.keys(pattern)
        
        cleaned_count = 0
        for key in keys:
            user_id = key.replace(self.user_sessions_prefix, "")
            sessions = await self.get_user_sessions(user_id, active_only=False)
            
            # Remove expired sessions from the set
            for session in sessions:
                if session.is_expired():
                    await self.terminate_session(session.session_id)
                    cleaned_count += 1
        
        return cleaned_count
    
    async def generate_token(self, user_id: str, session_id: str = None,
                           token_type: str = "access", scopes: List[str] = None,
                           duration: timedelta = None) -> TokenData:
        """Generate a JWT token."""
        now = datetime.utcnow()
        expires_at = now + (duration or self.default_token_duration)
        token_id = str(uuid.uuid4())
        
        payload = {
            'jti': token_id,  # JWT ID
            'sub': user_id,   # Subject (user ID)
            'iat': int(now.timestamp()),  # Issued at
            'exp': int(expires_at.timestamp()),  # Expires at
            'type': token_type,
            'scopes': scopes or [],
            'session_id': session_id
        }
        
        token = jwt.encode(payload, self.jwt_secret, algorithm='HS256')
        
        return TokenData(
            token=token,
            token_type=token_type,
            user_id=user_id,
            session_id=session_id,
            scopes=scopes or [],
            issued_at=now,
            expires_at=expires_at,
            metadata={}
        )
    
    async def validate_token(self, token: str) -> Optional[TokenData]:
        """Validate a JWT token."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            
            # Check if token is blacklisted
            token_id = payload.get('jti')
            if token_id:
                blacklist_key = self._token_blacklist_key(token_id)
                if await self.redis_client.exists(blacklist_key):
                    return None
            
            # Check if associated session is still active
            session_id = payload.get('session_id')
            if session_id:
                session = await self.get_session(session_id)
                if not session or not session.is_active():
                    return None
            
            return TokenData(
                token=token,
                token_type=payload.get('type', 'access'),
                user_id=payload['sub'],
                session_id=session_id,
                scopes=payload.get('scopes', []),
                issued_at=datetime.fromtimestamp(payload['iat']),
                expires_at=datetime.fromtimestamp(payload['exp']),
                metadata={}
            )
            
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    async def revoke_token(self, token: str) -> bool:
        """Revoke a token by adding it to blacklist."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            token_id = payload.get('jti')
            
            if not token_id:
                return False
            
            # Add to blacklist until token expires
            blacklist_key = self._token_blacklist_key(token_id)
            expires_at = datetime.fromtimestamp(payload['exp'])
            ttl = int((expires_at - datetime.utcnow()).total_seconds())
            
            if ttl > 0:
                await self.redis_client.setex(blacklist_key, ttl, "revoked")
            
            return True
            
        except jwt.InvalidTokenError:
            return False


class InMemorySessionManager(SessionManagerInterface):
    """In-memory session manager for testing and development."""
    
    def __init__(self, jwt_secret: str,
                 default_session_duration: timedelta = timedelta(hours=24),
                 default_token_duration: timedelta = timedelta(hours=1)):
        """Initialize in-memory session manager."""
        self.sessions: Dict[str, SessionData] = {}
        self.user_sessions: Dict[str, set] = {}
        self.token_blacklist: set = set()
        self.jwt_secret = jwt_secret
        self.default_session_duration = default_session_duration
        self.default_token_duration = default_token_duration
    
    async def create_session(self, user_id: str, ip_address: str, 
                           user_agent: str, device_type: str = "web",
                           location: str = None, duration: timedelta = None,
                           metadata: Dict[str, Any] = None) -> SessionData:
        """Create a new session."""
        session_id = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = now + (duration or self.default_session_duration)
        
        session = SessionData(
            session_id=session_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            device_type=device_type,
            location=location,
            created_at=now,
            last_activity=now,
            expires_at=expires_at,
            status=SessionStatus.ACTIVE,
            metadata=metadata or {}
        )
        
        self.sessions[session_id] = session
        
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = set()
        self.user_sessions[user_id].add(session_id)
        
        return session
    
    async def get_session(self, session_id: str) -> Optional[SessionData]:
        """Get session by ID."""
        session = self.sessions.get(session_id)
        
        if not session:
            return None
        
        if session.is_expired():
            await self.terminate_session(session_id)
            return None
        
        return session
    
    async def update_session(self, session_id: str, 
                           last_activity: datetime = None,
                           metadata: Dict[str, Any] = None) -> bool:
        """Update session activity and metadata."""
        session = await self.get_session(session_id)
        if not session:
            return False
        
        if last_activity:
            session.last_activity = last_activity
        else:
            session.last_activity = datetime.utcnow()
        
        if metadata:
            session.metadata.update(metadata)
        
        return True
    
    async def extend_session(self, session_id: str, 
                           duration: timedelta) -> bool:
        """Extend session expiration."""
        session = await self.get_session(session_id)
        if not session:
            return False
        
        session.extend(duration)
        return True
    
    async def terminate_session(self, session_id: str) -> bool:
        """Terminate a session."""
        session = self.sessions.get(session_id)
        if not session:
            return False
        
        # Remove from storage
        del self.sessions[session_id]
        
        # Remove from user sessions
        user_sessions = self.user_sessions.get(session.user_id)
        if user_sessions:
            user_sessions.discard(session_id)
        
        return True
    
    async def get_user_sessions(self, user_id: str, 
                              active_only: bool = True) -> List[SessionData]:
        """Get all sessions for a user."""
        session_ids = self.user_sessions.get(user_id, set())
        sessions = []
        
        for session_id in session_ids:
            session = await self.get_session(session_id)
            if session:
                if not active_only or session.is_active():
                    sessions.append(session)
        
        return sessions
    
    async def terminate_user_sessions(self, user_id: str, 
                                    exclude_session: str = None) -> int:
        """Terminate all sessions for a user."""
        sessions = await self.get_user_sessions(user_id, active_only=False)
        terminated_count = 0
        
        for session in sessions:
            if exclude_session and session.session_id == exclude_session:
                continue
            
            if await self.terminate_session(session.session_id):
                terminated_count += 1
        
        return terminated_count
    
    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions."""
        expired_sessions = []
        
        for session_id, session in self.sessions.items():
            if session.is_expired():
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            await self.terminate_session(session_id)
        
        return len(expired_sessions)
    
    async def generate_token(self, user_id: str, session_id: str = None,
                           token_type: str = "access", scopes: List[str] = None,
                           duration: timedelta = None) -> TokenData:
        """Generate a JWT token."""
        now = datetime.utcnow()
        expires_at = now + (duration or self.default_token_duration)
        token_id = str(uuid.uuid4())
        
        payload = {
            'jti': token_id,
            'sub': user_id,
            'iat': int(now.timestamp()),
            'exp': int(expires_at.timestamp()),
            'type': token_type,
            'scopes': scopes or [],
            'session_id': session_id
        }
        
        token = jwt.encode(payload, self.jwt_secret, algorithm='HS256')
        
        return TokenData(
            token=token,
            token_type=token_type,
            user_id=user_id,
            session_id=session_id,
            scopes=scopes or [],
            issued_at=now,
            expires_at=expires_at,
            metadata={}
        )
    
    async def validate_token(self, token: str) -> Optional[TokenData]:
        """Validate a JWT token."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            
            # Check if token is blacklisted
            token_id = payload.get('jti')
            if token_id and token_id in self.token_blacklist:
                return None
            
            # Check if associated session is still active
            session_id = payload.get('session_id')
            if session_id:
                session = await self.get_session(session_id)
                if not session or not session.is_active():
                    return None
            
            return TokenData(
                token=token,
                token_type=payload.get('type', 'access'),
                user_id=payload['sub'],
                session_id=session_id,
                scopes=payload.get('scopes', []),
                issued_at=datetime.fromtimestamp(payload['iat']),
                expires_at=datetime.fromtimestamp(payload['exp']),
                metadata={}
            )
            
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    async def revoke_token(self, token: str) -> bool:
        """Revoke a token by adding it to blacklist."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            token_id = payload.get('jti')
            
            if token_id:
                self.token_blacklist.add(token_id)
                return True
            
            return False
            
        except jwt.InvalidTokenError:
            return False


def create_session_manager(redis_url: str = None, jwt_secret: str = None) -> SessionManagerInterface:
    """Factory function to create session manager."""
    if not jwt_secret:
        jwt_secret = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
    
    if redis_url:
        return RedisSessionManager(redis_url, jwt_secret)
    else:
        return InMemorySessionManager(jwt_secret)