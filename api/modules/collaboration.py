"""
Collaboration Module
Provides multi-user collaboration features for construction estimation
"""

import json
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

@dataclass
class User:
    """User data model"""
    id: str
    username: str
    email: str = ""
    full_name: str = ""
    role: str = "user"  # user, admin, manager, viewer
    permissions: List[str] = None
    created_date: str = ""
    last_login: str = ""
    status: str = "active"
    
    def __post_init__(self):
        if self.permissions is None:
            self.permissions = self._get_default_permissions()
        if not self.created_date:
            self.created_date = datetime.now().isoformat()
    
    def _get_default_permissions(self) -> List[str]:
        """Get default permissions based on role"""
        permission_map = {
            'viewer': ['view_projects', 'view_reports'],
            'user': ['view_projects', 'edit_measurements', 'create_reports', 'import_excel'],
            'manager': ['view_projects', 'edit_measurements', 'create_reports', 'import_excel', 
                       'manage_projects', 'approve_estimates'],
            'admin': ['all']
        }
        return permission_map.get(self.role, permission_map['user'])

@dataclass
class Comment:
    """Comment data model"""
    id: str
    project_id: str
    user_id: str
    content: str
    item_reference: str = ""  # Reference to specific measurement/abstract item
    created_date: str = ""
    status: str = "active"
    replies: List[str] = None  # List of reply comment IDs
    
    def __post_init__(self):
        if not self.created_date:
            self.created_date = datetime.now().isoformat()
        if self.replies is None:
            self.replies = []

@dataclass
class ActivityLog:
    """Activity log data model"""
    id: str
    user_id: str
    project_id: str
    action: str
    details: str
    timestamp: str = ""
    ip_address: str = ""
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()

class CollaborationManager:
    """Manages collaboration features"""
    
    def __init__(self, database):
        self.database = database
        self.active_sessions = {}
        self.notifications = []
    
    def create_user(self, username: str, email: str, full_name: str, role: str = "user") -> User:
        """Create a new user"""
        try:
            user = User(
                id=str(uuid.uuid4()),
                username=username,
                email=email,
                full_name=full_name,
                role=role
            )
            
            # Save to database
            conn = self.database.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO users (id, username, email, full_name, role, permissions, created_date, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user.id, user.username, user.email, user.full_name, user.role,
                json.dumps(user.permissions), user.created_date, user.status
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"User created: {username}")
            return user
            
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise
    
    def authenticate_user(self, username: str, password: str = None) -> Optional[User]:
        """Authenticate user (simplified for demo)"""
        try:
            conn = self.database.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM users WHERE username = ? AND status = 'active'", (username,))
            row = cursor.fetchone()
            conn.close()
            
            if row:
                user_data = dict(zip([col[0] for col in cursor.description], row))
                user_data['permissions'] = json.loads(user_data['permissions']) if user_data['permissions'] else []
                return User(**user_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error authenticating user: {e}")
            return None
    
    def add_comment(self, project_id: str, user_id: str, content: str, 
                   item_reference: str = "") -> Comment:
        """Add a comment to a project"""
        try:
            comment = Comment(
                id=str(uuid.uuid4()),
                project_id=project_id,
                user_id=user_id,
                content=content,
                item_reference=item_reference
            )
            
            # Save to database (would need comments table)
            # For now, store in memory
            if not hasattr(self, 'comments'):
                self.comments = []
            self.comments.append(comment)
            
            # Log activity
            self.log_activity(user_id, project_id, "comment_added", f"Added comment: {content[:50]}...")
            
            logger.info(f"Comment added to project {project_id}")
            return comment
            
        except Exception as e:
            logger.error(f"Error adding comment: {e}")
            raise
    
    def get_project_comments(self, project_id: str) -> List[Comment]:
        """Get all comments for a project"""
        try:
            if not hasattr(self, 'comments'):
                return []
            
            project_comments = [c for c in self.comments if c.project_id == project_id and c.status == 'active']
            return sorted(project_comments, key=lambda x: x.created_date, reverse=True)
            
        except Exception as e:
            logger.error(f"Error getting comments: {e}")
            return []
    
    def log_activity(self, user_id: str, project_id: str, action: str, details: str):
        """Log user activity"""
        try:
            activity = ActivityLog(
                id=str(uuid.uuid4()),
                user_id=user_id,
                project_id=project_id,
                action=action,
                details=details
            )
            
            conn = self.database.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO activity_logs (id, user_id, project_id, action, details, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                activity.id, activity.user_id, activity.project_id,
                activity.action, activity.details, activity.timestamp
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error logging activity: {e}")
    
    def get_project_activity(self, project_id: str, limit: int = 50) -> List[ActivityLog]:
        """Get recent activity for a project"""
        try:
            conn = self.database.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM activity_logs 
                WHERE project_id = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            """, (project_id, limit))
            
            rows = cursor.fetchall()
            conn.close()
            
            activities = []
            for row in rows:
                activity_data = dict(zip([col[0] for col in cursor.description], row))
                activities.append(ActivityLog(**activity_data))
            
            return activities
            
        except Exception as e:
            logger.error(f"Error getting project activity: {e}")
            return []
    
    def create_notification(self, user_id: str, title: str, message: str, 
                          notification_type: str = "info"):
        """Create a notification for a user"""
        notification = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'title': title,
            'message': message,
            'type': notification_type,
            'created_date': datetime.now().isoformat(),
            'read': False
        }
        
        self.notifications.append(notification)
        logger.info(f"Notification created for user {user_id}: {title}")
    
    def get_user_notifications(self, user_id: str, unread_only: bool = False) -> List[Dict]:
        """Get notifications for a user"""
        user_notifications = [n for n in self.notifications if n['user_id'] == user_id]
        
        if unread_only:
            user_notifications = [n for n in user_notifications if not n['read']]
        
        return sorted(user_notifications, key=lambda x: x['created_date'], reverse=True)
    
    def mark_notification_read(self, notification_id: str):
        """Mark a notification as read"""
        for notification in self.notifications:
            if notification['id'] == notification_id:
                notification['read'] = True
                break
    
    def get_project_collaborators(self, project_id: str) -> List[Dict]:
        """Get all collaborators for a project"""
        try:
            # Get users who have activity on this project
            conn = self.database.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT DISTINCT u.id, u.username, u.full_name, u.role, u.last_login
                FROM users u
                JOIN activity_logs a ON u.id = a.user_id
                WHERE a.project_id = ? AND u.status = 'active'
                ORDER BY u.last_login DESC
            """, (project_id,))
            
            rows = cursor.fetchall()
            conn.close()
            
            collaborators = []
            for row in rows:
                collaborator = dict(zip([col[0] for col in cursor.description], row))
                collaborators.append(collaborator)
            
            return collaborators
            
        except Exception as e:
            logger.error(f"Error getting collaborators: {e}")
            return []
    
    def check_permission(self, user: User, permission: str) -> bool:
        """Check if user has specific permission"""
        if 'all' in user.permissions:
            return True
        return permission in user.permissions
    
    def get_user_projects(self, user_id: str) -> List[Dict]:
        """Get projects accessible to a user"""
        try:
            conn = self.database.get_connection()
            cursor = conn.cursor()
            
            # Get projects where user has activity or is creator
            cursor.execute("""
                SELECT DISTINCT p.id, p.name, p.location, p.status, p.created_date, p.total_cost
                FROM projects p
                LEFT JOIN activity_logs a ON p.id = a.project_id
                WHERE p.created_by = ? OR a.user_id = ?
                ORDER BY p.last_modified DESC
            """, (user_id, user_id))
            
            rows = cursor.fetchall()
            conn.close()
            
            projects = []
            for row in rows:
                project = dict(zip([col[0] for col in cursor.description], row))
                projects.append(project)
            
            return projects
            
        except Exception as e:
            logger.error(f"Error getting user projects: {e}")
            return []
    
    def create_project_invitation(self, project_id: str, inviter_id: str, 
                                invitee_email: str, role: str = "user") -> Dict:
        """Create a project invitation"""
        invitation = {
            'id': str(uuid.uuid4()),
            'project_id': project_id,
            'inviter_id': inviter_id,
            'invitee_email': invitee_email,
            'role': role,
            'status': 'pending',
            'created_date': datetime.now().isoformat(),
            'expires_date': (datetime.now() + timedelta(days=7)).isoformat()
        }
        
        # Store invitation (would need invitations table)
        if not hasattr(self, 'invitations'):
            self.invitations = []
        self.invitations.append(invitation)
        
        logger.info(f"Project invitation created for {invitee_email}")
        return invitation
    
    def accept_invitation(self, invitation_id: str, user_id: str) -> bool:
        """Accept a project invitation"""
        try:
            if not hasattr(self, 'invitations'):
                return False
            
            for invitation in self.invitations:
                if invitation['id'] == invitation_id and invitation['status'] == 'pending':
                    invitation['status'] = 'accepted'
                    invitation['accepted_by'] = user_id
                    invitation['accepted_date'] = datetime.now().isoformat()
                    
                    # Log activity
                    self.log_activity(user_id, invitation['project_id'], 
                                    "invitation_accepted", "Joined project via invitation")
                    
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error accepting invitation: {e}")
            return False