"""
Security Manager Module
Provides comprehensive security features including authentication, authorization, and data protection
"""

import hashlib
import logging
import re
import secrets
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple


logger = logging.getLogger(__name__)

@dataclass
class SecurityConfig:
    """Security configuration settings"""
    jwt_secret: str = secrets.token_urlsafe(32)
    jwt_expiry_hours: int = 24
    password_min_length: int = 8
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 30
    session_timeout_minutes: int = 60
    require_2fa: bool = False
    allowed_file_types: List[str] = None
    max_file_size_mb: int = 50

    def __post_init__(self):
        if self.allowed_file_types is None:
            self.allowed_file_types = ['.xlsx', '.xls', '.csv']

class SecurityManager:
    """Comprehensive security management system"""
    
    def __init__(self, database, config: SecurityConfig = None):
        self.database = database
        self.config = config or SecurityConfig()
        self.failed_attempts = {}  # Track failed login attempts
        self.active_sessions = {}  # Track active user sessions
        
    def hash_password(self, password: str, salt: str = None) -> Tuple[str, str]:
        """
        Hash password with salt using PBKDF2
        
        Args:
            password: Plain text password
            salt: Optional salt (generated if not provided)
        
        Returns:
            Tuple of (hashed_password, salt)
        """
        if salt is None:
            salt = secrets.token_hex(32)
        
        # Use PBKDF2 with SHA-256
        hashed = hashlib.pbkdf2_hmac('sha256', 
                                   password.encode('utf-8'), 
                                   salt.encode('utf-8'), 
                                   100000)  # 100,000 iterations
        
        return hashed.hex(), salt
    
    def verify_password(self, password: str, hashed_password: str, salt: str) -> bool:
        """
        Verify password against hash
        
        Args:
            password: Plain text password
            hashed_password: Stored hash
            salt: Stored salt
        
        Returns:
            True if password matches
        """
        try:
            computed_hash, _ = self.hash_password(password, salt)
            return secrets.compare_digest(computed_hash, hashed_password)
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    def validate_password_strength(self, password: str) -> Tuple[bool, List[str]]:
        """
        Validate password strength
        
        Args:
            password: Password to validate
        
        Returns:
            Tuple of (is_valid, list_of_issues)
        """
        issues = []
        
        # Length check
        if len(password) < self.config.password_min_length:
            issues.append(f"Password must be at least {self.config.password_min_length} characters long")
        
        # Character variety checks
        if not re.search(r'[a-z]', password):
            issues.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'[A-Z]', password):
            issues.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'\d', password):
            issues.append("Password must contain at least one digit")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            issues.append("Password must contain at least one special character")
        
        # Common password check
        common_passwords = [
            'password', '123456', 'password123', 'admin', 'qwerty',
            'letmein', 'welcome', 'monkey', '1234567890'
        ]
        
        if password.lower() in common_passwords:
            issues.append("Password is too common")
        
        return len(issues) == 0, issues
    
    def create_user(self, username: str, password: str, email: str, 
                   full_name: str, role: str = 'user') -> Tuple[bool, str]:
        """
        Create new user with security validation
        
        Args:
            username: Unique username
            password: Plain text password
            email: User email
            full_name: User's full name
            role: User role
        
        Returns:
            Tuple of (success, message)
        """
        try:
            # Validate inputs
            if not self._validate_username(username):
                return False, "Invalid username format"
            
            if not self._validate_email(email):
                return False, "Invalid email format"
            
            # Check password strength
            is_strong, issues = self.validate_password_strength(password)
            if not is_strong:
                return False, "; ".join(issues)
            
            # Check if user already exists
            if self._user_exists(username, email):
                return False, "Username or email already exists"
            
            # Hash password
            hashed_password, salt = self.hash_password(password)
            
            # Create user record
            conn = sqlite3.connect(self.database.db_path)
            cursor = conn.cursor()
            
            user_id = secrets.token_urlsafe(16)
            
            cursor.execute("""
                INSERT INTO users (id, username, password, email, full_name, role, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id, username, f"{hashed_password}:{salt}", email, 
                full_name, role, datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"User created: {username}")
            return True, "User created successfully"
            
        except Exception as e:
            logger.error(f"User creation error: {e}")
            return False, "Failed to create user"
    
    def authenticate_user(self, username: str, password: str, 
                         ip_address: str = None) -> Tuple[bool, Optional[Dict], str]:
        """
        Authenticate user with security checks
        
        Args:
            username: Username
            password: Password
            ip_address: Client IP address
        
        Returns:
            Tuple of (success, user_data, message)
        """
        try:
            # Check for account lockout
            if self._is_account_locked(username, ip_address):
                return False, None, "Account temporarily locked due to failed attempts"
            
            # Get user from database
            conn = sqlite3.connect(self.database.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, username, password, email, full_name, role, status
                FROM users WHERE username = ? AND status = 'active'
            """, (username,))
            
            user_row = cursor.fetchone()
            conn.close()
            
            if not user_row:
                self._record_failed_attempt(username, ip_address)
                return False, None, "Invalid credentials"
            
            # Verify password
            user_id, db_username, stored_password, email, full_name, role, status = user_row
            
            if ':' not in stored_password:
                # Legacy password format - needs migration
                return False, None, "Account needs password reset"
            
            hashed_password, salt = stored_password.split(':', 1)
            
            if not self.verify_password(password, hashed_password, salt):
                self._record_failed_attempt(username, ip_address)
                return False, None, "Invalid credentials"
            
            # Clear failed attempts on successful login
            self._clear_failed_attempts(username, ip_address)
            
            # Create session
            session_token = self._create_session(user_id, ip_address)
            
            # Update last login
            self._update_last_login(user_id)
            
            user_data = {
                'id': user_id,
                'username': db_username,
                'email': email,
                'full_name': full_name,
                'role': role,
                'session_token': session_token
            }
            
            logger.info(f"User authenticated: {username}")
            return True, user_data, "Authentication successful"
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return False, None, "Authentication failed"
    
    def validate_session(self, session_token: str) -> Tuple[bool, Optional[Dict]]:
        """
        Validate user session
        
        Args:
            session_token: Session token
        
        Returns:
            Tuple of (is_valid, user_data)
        """
        try:
            if not session_token or session_token not in self.active_sessions:
                return False, None
            
            session_data = self.active_sessions[session_token]
            
            # Check if session has expired
            if datetime.now() > session_data['expires_at']:
                del self.active_sessions[session_token]
                return False, None
            
            # Extend session
            session_data['expires_at'] = datetime.now() + timedelta(
                minutes=self.config.session_timeout_minutes
            )
            
            return True, session_data['user_data']
            
        except Exception as e:
            logger.error(f"Session validation error: {e}")
            return False, None
    
    def logout_user(self, session_token: str) -> bool:
        """
        Logout user and invalidate session
        
        Args:
            session_token: Session token to invalidate
        
        Returns:
            Success status
        """
        try:
            if session_token in self.active_sessions:
                user_data = self.active_sessions[session_token]['user_data']
                del self.active_sessions[session_token]
                logger.info(f"User logged out: {user_data.get('username')}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return False
    
    def check_permission(self, user_data: Dict, required_permission: str) -> bool:
        """
        Check if user has required permission
        
        Args:
            user_data: User data dictionary
            required_permission: Permission to check
        
        Returns:
            True if user has permission
        """
        user_role = user_data.get('role', 'user')
        
        # Define role permissions
        role_permissions = {
            'admin': ['all'],
            'manager': [
                'view_projects', 'create_projects', 'edit_projects', 'delete_projects',
                'view_estimates', 'create_estimates', 'edit_estimates',
                'view_ssr', 'edit_ssr', 'manage_users', 'view_reports'
            ],
            'user': [
                'view_projects', 'create_projects', 'edit_projects',
                'view_estimates', 'create_estimates', 'edit_estimates',
                'view_ssr', 'view_reports'
            ],
            'viewer': ['view_projects', 'view_estimates', 'view_ssr', 'view_reports']
        }
        
        user_permissions = role_permissions.get(user_role, [])
        
        return 'all' in user_permissions or required_permission in user_permissions
    
    def sanitize_file_upload(self, uploaded_file) -> Tuple[bool, List[str]]:
        """
        Sanitize and validate uploaded files
        
        Args:
            uploaded_file: Streamlit uploaded file object
        
        Returns:
            Tuple of (is_safe, list_of_issues)
        """
        issues = []
        
        # File size check
        if uploaded_file.size > self.config.max_file_size_mb * 1024 * 1024:
            issues.append(f"File size exceeds {self.config.max_file_size_mb}MB limit")
        
        # File type check
        file_ext = '.' + uploaded_file.name.split('.')[-1].lower()
        if file_ext not in self.config.allowed_file_types:
            issues.append(f"File type {file_ext} not allowed")
        
        # File name validation
        if not self._validate_filename(uploaded_file.name):
            issues.append("Invalid file name")
        
        # Content validation (basic)
        if uploaded_file.size == 0:
            issues.append("File is empty")
        
        return len(issues) == 0, issues
    
    def audit_log(self, user_id: str, action: str, resource: str, 
                  details: str = None, ip_address: str = None):
        """
        Log security-relevant actions
        
        Args:
            user_id: User performing action
            action: Action performed
            resource: Resource affected
            details: Additional details
            ip_address: Client IP address
        """
        try:
            conn = sqlite3.connect(self.database.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO activity_log (id, user_id, action, entity_type, entity_id, 
                                        details, ip_address, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                secrets.token_urlsafe(16), user_id, action, 'security', resource,
                details, ip_address, datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Audit logging error: {e}")
    
    def _validate_username(self, username: str) -> bool:
        """Validate username format"""
        if not username or len(username) < 3 or len(username) > 50:
            return False
        
        # Allow alphanumeric and underscore
        return re.match(r'^[a-zA-Z0-9_]+$', username) is not None
    
    def _validate_email(self, email: str) -> bool:
        """Validate email format"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(email_pattern, email) is not None
    
    def _validate_filename(self, filename: str) -> bool:
        """Validate uploaded filename"""
        if not filename or len(filename) > 255:
            return False
        
        # Check for dangerous characters
        dangerous_chars = ['..', '/', '\\', '<', '>', ':', '"', '|', '?', '*']
        return not any(char in filename for char in dangerous_chars)
    
    def _user_exists(self, username: str, email: str) -> bool:
        """Check if user already exists"""
        try:
            conn = sqlite3.connect(self.database.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT COUNT(*) FROM users 
                WHERE username = ? OR email = ?
            """, (username, email))
            
            count = cursor.fetchone()[0]
            conn.close()
            
            return count > 0
            
        except Exception as e:
            logger.error(f"User existence check error: {e}")
            return True  # Err on the side of caution
    
    def _is_account_locked(self, username: str, ip_address: str) -> bool:
        """Check if account is locked due to failed attempts"""
        key = f"{username}:{ip_address}"
        
        if key not in self.failed_attempts:
            return False
        
        attempt_data = self.failed_attempts[key]
        
        # Check if lockout period has expired
        if datetime.now() > attempt_data['locked_until']:
            del self.failed_attempts[key]
            return False
        
        return attempt_data['count'] >= self.config.max_login_attempts
    
    def _record_failed_attempt(self, username: str, ip_address: str):
        """Record failed login attempt"""
        key = f"{username}:{ip_address}"
        
        if key not in self.failed_attempts:
            self.failed_attempts[key] = {'count': 0, 'locked_until': datetime.now()}
        
        self.failed_attempts[key]['count'] += 1
        
        if self.failed_attempts[key]['count'] >= self.config.max_login_attempts:
            self.failed_attempts[key]['locked_until'] = datetime.now() + timedelta(
                minutes=self.config.lockout_duration_minutes
            )
    
    def _clear_failed_attempts(self, username: str, ip_address: str):
        """Clear failed login attempts on successful login"""
        key = f"{username}:{ip_address}"
        if key in self.failed_attempts:
            del self.failed_attempts[key]
    
    def _create_session(self, user_id: str, ip_address: str) -> str:
        """Create user session"""
        session_token = secrets.token_urlsafe(32)
        
        # Get user data
        conn = sqlite3.connect(self.database.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT username, email, full_name, role
            FROM users WHERE id = ?
        """, (user_id,))
        
        user_row = cursor.fetchone()
        conn.close()
        
        if user_row:
            username, email, full_name, role = user_row
            
            self.active_sessions[session_token] = {
                'user_data': {
                    'id': user_id,
                    'username': username,
                    'email': email,
                    'full_name': full_name,
                    'role': role
                },
                'created_at': datetime.now(),
                'expires_at': datetime.now() + timedelta(
                    minutes=self.config.session_timeout_minutes
                ),
                'ip_address': ip_address
            }
        
        return session_token
    
    def _update_last_login(self, user_id: str):
        """Update user's last login timestamp"""
        try:
            conn = sqlite3.connect(self.database.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE users SET last_login = ? WHERE id = ?
            """, (datetime.now().isoformat(), user_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Last login update error: {e}")

class InputSanitizer:
    """Input sanitization utilities"""
    
    @staticmethod
    def sanitize_sql_input(text: str) -> str:
        """Sanitize input to prevent SQL injection"""
        if not isinstance(text, str):
            text = str(text)
        
        # Remove or escape dangerous SQL characters
        dangerous_patterns = [
            r"[';\"\\]",  # Quotes and backslashes
            r"--",        # SQL comments
            r"/\*.*?\*/", # Multi-line comments
            r"\b(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|EXEC|EXECUTE)\b"  # Dangerous keywords
        ]
        
        for pattern in dangerous_patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE)
        
        return text.strip()
    
    @staticmethod
    def sanitize_html_input(text: str) -> str:
        """Sanitize input to prevent XSS"""
        if not isinstance(text, str):
            text = str(text)
        
        # Remove HTML tags and dangerous characters
        text = re.sub(r'<[^>]+>', '', text)  # Remove HTML tags
        text = re.sub(r'[<>&"\']', '', text)  # Remove dangerous characters
        
        return text.strip()
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for safe storage"""
        if not isinstance(filename, str):
            filename = str(filename)
        
        # Remove dangerous characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        
        # Remove leading/trailing dots and spaces
        filename = filename.strip('. ')
        
        # Limit length
        if len(filename) > 255:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            filename = name[:250] + ('.' + ext if ext else '')
        
        return filename