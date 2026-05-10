"""
Version Control Module
Provides version control and backup functionality for construction estimation projects
"""

import hashlib
import json
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional


logger = logging.getLogger(__name__)

@dataclass
class ProjectVersion:
    """Project version data model"""
    id: str
    project_id: str
    version_number: int
    changes_summary: str
    created_by: str
    created_date: str = ""
    data_snapshot: str = ""  # JSON snapshot of project data
    file_hash: str = ""
    tags: List[str] = None
    
    def __post_init__(self):
        if not self.created_date:
            self.created_date = datetime.now().isoformat()
        if self.tags is None:
            self.tags = []

@dataclass
class ChangeLog:
    """Change log entry"""
    id: str
    project_id: str
    version_id: str
    change_type: str  # create, update, delete
    item_type: str    # measurement, abstract, project
    item_id: str
    old_value: str = ""
    new_value: str = ""
    field_name: str = ""
    user_id: str = ""
    timestamp: str = ""
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()

class VersionControl:
    """Version control system for construction estimation projects"""
    
    def __init__(self, database):
        self.database = database
        self.auto_backup_enabled = True
        self.max_versions = 50  # Maximum versions to keep per project
    
    def create_version(self, project_id: str, changes_summary: str, 
                      user_id: str, project_data: Dict) -> ProjectVersion:
        """Create a new version of the project"""
        try:
            # Get current version number
            current_version = self.get_latest_version_number(project_id)
            new_version_number = current_version + 1
            
            # Create data snapshot
            data_snapshot = json.dumps(project_data, default=str, indent=2)
            file_hash = hashlib.md5(data_snapshot.encode()).hexdigest()
            
            # Create version
            version = ProjectVersion(
                id=str(uuid.uuid4()),
                project_id=project_id,
                version_number=new_version_number,
                changes_summary=changes_summary,
                created_by=user_id,
                data_snapshot=data_snapshot,
                file_hash=file_hash
            )
            
            # Save to database
            self._save_version_to_db(version)
            
            # Clean up old versions if needed
            self._cleanup_old_versions(project_id)
            
            logger.info(f"Version {new_version_number} created for project {project_id}")
            return version
            
        except Exception as e:
            logger.error(f"Error creating version: {e}")
            raise
    
    def get_latest_version_number(self, project_id: str) -> int:
        """Get the latest version number for a project"""
        try:
            conn = self.database.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT MAX(version_number) FROM version_history 
                WHERE project_id = ?
            """, (project_id,))
            
            result = cursor.fetchone()
            conn.close()
            
            return result[0] if result[0] is not None else 0
            
        except Exception as e:
            logger.error(f"Error getting latest version: {e}")
            return 0
    
    def get_project_versions(self, project_id: str, limit: int = 20) -> List[ProjectVersion]:
        """Get version history for a project"""
        try:
            conn = self.database.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM version_history 
                WHERE project_id = ? 
                ORDER BY version_number DESC 
                LIMIT ?
            """, (project_id, limit))
            
            rows = cursor.fetchall()
            conn.close()
            
            versions = []
            for row in rows:
                version_data = dict(zip([col[0] for col in cursor.description], row))
                # Parse tags if they exist
                if version_data.get('tags'):
                    version_data['tags'] = json.loads(version_data['tags'])
                else:
                    version_data['tags'] = []
                
                versions.append(ProjectVersion(**version_data))
            
            return versions
            
        except Exception as e:
            logger.error(f"Error getting project versions: {e}")
            return []
    
    def restore_version(self, project_id: str, version_number: int, user_id: str) -> bool:
        """Restore a project to a specific version"""
        try:
            # Get the version data
            version = self.get_version(project_id, version_number)
            if not version:
                logger.error(f"Version {version_number} not found for project {project_id}")
                return False
            
            # Parse the data snapshot
            project_data = json.loads(version.data_snapshot)
            
            # Create a backup of current state before restoring
            current_data = self._get_current_project_data(project_id)
            self.create_version(
                project_id, 
                f"Backup before restoring to version {version_number}",
                user_id,
                current_data
            )
            
            # Restore the data
            self._restore_project_data(project_id, project_data)
            
            # Log the restoration
            self._log_change(
                project_id, version.id, "restore", "project", project_id,
                "", f"Restored to version {version_number}", "version", user_id
            )
            
            logger.info(f"Project {project_id} restored to version {version_number}")
            return True
            
        except Exception as e:
            logger.error(f"Error restoring version: {e}")
            return False
    
    def get_version(self, project_id: str, version_number: int) -> Optional[ProjectVersion]:
        """Get a specific version"""
        try:
            conn = self.database.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM version_history 
                WHERE project_id = ? AND version_number = ?
            """, (project_id, version_number))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                version_data = dict(zip([col[0] for col in cursor.description], row))
                if version_data.get('tags'):
                    version_data['tags'] = json.loads(version_data['tags'])
                else:
                    version_data['tags'] = []
                
                return ProjectVersion(**version_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting version: {e}")
            return None
    
    def compare_versions(self, project_id: str, version1: int, version2: int) -> Dict:
        """Compare two versions of a project"""
        try:
            v1 = self.get_version(project_id, version1)
            v2 = self.get_version(project_id, version2)
            
            if not v1 or not v2:
                return {'error': 'One or both versions not found'}
            
            data1 = json.loads(v1.data_snapshot)
            data2 = json.loads(v2.data_snapshot)
            
            comparison = {
                'version1': version1,
                'version2': version2,
                'differences': self._find_differences(data1, data2),
                'summary': {
                    'measurements_changed': 0,
                    'abstracts_changed': 0,
                    'project_info_changed': False
                }
            }
            
            # Count changes
            for diff in comparison['differences']:
                if 'measurements' in diff['path']:
                    comparison['summary']['measurements_changed'] += 1
                elif 'abstracts' in diff['path']:
                    comparison['summary']['abstracts_changed'] += 1
                elif 'project' in diff['path']:
                    comparison['summary']['project_info_changed'] = True
            
            return comparison
            
        except Exception as e:
            logger.error(f"Error comparing versions: {e}")
            return {'error': str(e)}
    
    def _find_differences(self, data1: Dict, data2: Dict, path: str = "") -> List[Dict]:
        """Find differences between two data structures"""
        differences = []
        
        try:
            # Compare dictionaries
            if isinstance(data1, dict) and isinstance(data2, dict):
                all_keys = set(data1.keys()) | set(data2.keys())
                
                for key in all_keys:
                    current_path = f"{path}.{key}" if path else key
                    
                    if key not in data1:
                        differences.append({
                            'type': 'added',
                            'path': current_path,
                            'new_value': data2[key]
                        })
                    elif key not in data2:
                        differences.append({
                            'type': 'removed',
                            'path': current_path,
                            'old_value': data1[key]
                        })
                    else:
                        differences.extend(self._find_differences(data1[key], data2[key], current_path))
            
            # Compare lists
            elif isinstance(data1, list) and isinstance(data2, list):
                if data1 != data2:
                    differences.append({
                        'type': 'modified',
                        'path': path,
                        'old_value': data1,
                        'new_value': data2
                    })
            
            # Compare primitive values
            else:
                if data1 != data2:
                    differences.append({
                        'type': 'modified',
                        'path': path,
                        'old_value': data1,
                        'new_value': data2
                    })
        
        except Exception as e:
            logger.error(f"Error finding differences: {e}")
        
        return differences
    
    def create_branch(self, project_id: str, branch_name: str, user_id: str) -> str:
        """Create a new branch from current version"""
        try:
            # Get current project data
            current_data = self._get_current_project_data(project_id)
            
            # Create new project as branch
            branch_project_id = str(uuid.uuid4())
            
            # Copy project with new ID
            branch_data = current_data.copy()
            branch_data['id'] = branch_project_id
            branch_data['name'] = f"{branch_data.get('name', 'Project')} - {branch_name}"
            branch_data['parent_project_id'] = project_id
            branch_data['branch_name'] = branch_name
            
            # Save branch project
            self._create_branch_project(branch_data)
            
            # Create initial version for branch
            self.create_version(
                branch_project_id,
                f"Created branch '{branch_name}' from project {project_id}",
                user_id,
                branch_data
            )
            
            logger.info(f"Branch '{branch_name}' created for project {project_id}")
            return branch_project_id
            
        except Exception as e:
            logger.error(f"Error creating branch: {e}")
            raise
    
    def merge_branch(self, source_project_id: str, target_project_id: str, 
                    user_id: str, merge_strategy: str = "overwrite") -> bool:
        """Merge changes from one branch to another"""
        try:
            # Get data from both projects
            source_data = self._get_current_project_data(source_project_id)
            target_data = self._get_current_project_data(target_project_id)
            
            # Create backup of target before merge
            self.create_version(
                target_project_id,
                f"Backup before merge from {source_project_id}",
                user_id,
                target_data
            )
            
            # Perform merge based on strategy
            if merge_strategy == "overwrite":
                merged_data = source_data.copy()
                merged_data['id'] = target_project_id
            else:
                # More sophisticated merge logic would go here
                merged_data = self._smart_merge(source_data, target_data)
            
            # Apply merged data
            self._restore_project_data(target_project_id, merged_data)
            
            # Create version for the merge
            self.create_version(
                target_project_id,
                f"Merged changes from {source_project_id}",
                user_id,
                merged_data
            )
            
            logger.info(f"Successfully merged {source_project_id} into {target_project_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error merging branches: {e}")
            return False
    
    def _smart_merge(self, source_data: Dict, target_data: Dict) -> Dict:
        """Perform intelligent merge of two data sets"""
        # This is a simplified merge - in production, you'd want more sophisticated logic
        merged_data = target_data.copy()
        
        # Merge measurements
        if 'measurements' in source_data:
            if 'measurements' not in merged_data:
                merged_data['measurements'] = {}
            
            for sheet_name, measurements in source_data['measurements'].items():
                merged_data['measurements'][sheet_name] = measurements
        
        # Merge abstracts
        if 'abstracts' in source_data:
            if 'abstracts' not in merged_data:
                merged_data['abstracts'] = {}
            
            for sheet_name, abstracts in source_data['abstracts'].items():
                merged_data['abstracts'][sheet_name] = abstracts
        
        return merged_data
    
    def _save_version_to_db(self, version: ProjectVersion):
        """Save version to database"""
        try:
            conn = self.database.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO version_history 
                (id, project_id, version_number, changes_summary, created_by, 
                 created_date, data_snapshot)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                version.id, version.project_id, version.version_number,
                version.changes_summary, version.created_by, version.created_date,
                version.data_snapshot
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error saving version to database: {e}")
            raise
    
    def _cleanup_old_versions(self, project_id: str):
        """Remove old versions beyond the limit"""
        try:
            conn = self.database.get_connection()
            cursor = conn.cursor()
            
            # Get count of versions
            cursor.execute("SELECT COUNT(*) FROM version_history WHERE project_id = ?", (project_id,))
            count = cursor.fetchone()[0]
            
            if count > self.max_versions:
                # Delete oldest versions
                versions_to_delete = count - self.max_versions
                cursor.execute("""
                    DELETE FROM version_history 
                    WHERE project_id = ? 
                    ORDER BY version_number ASC 
                    LIMIT ?
                """, (project_id, versions_to_delete))
                
                conn.commit()
                logger.info(f"Cleaned up {versions_to_delete} old versions for project {project_id}")
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Error cleaning up old versions: {e}")
    
    def _get_current_project_data(self, project_id: str) -> Dict:
        """Get current project data"""
        # This would fetch current project data from the database
        # For now, return a placeholder
        return {
            'id': project_id,
            'measurements': {},
            'abstracts': {},
            'project_info': {}
        }
    
    def _restore_project_data(self, project_id: str, project_data: Dict):
        """Restore project data from snapshot"""
        # This would restore the project data to the database
        # Implementation would depend on your specific database schema
        pass
    
    def _create_branch_project(self, branch_data: Dict):
        """Create a new project for the branch"""
        # This would create a new project record in the database
        pass
    
    def _log_change(self, project_id: str, version_id: str, change_type: str,
                   item_type: str, item_id: str, old_value: str, new_value: str,
                   field_name: str, user_id: str):
        """Log a change to the change log"""
        try:
            change_log = ChangeLog(
                id=str(uuid.uuid4()),
                project_id=project_id,
                version_id=version_id,
                change_type=change_type,
                item_type=item_type,
                item_id=item_id,
                old_value=old_value,
                new_value=new_value,
                field_name=field_name,
                user_id=user_id
            )
            
            # Save to database (would need change_logs table)
            logger.info(f"Change logged: {change_type} {item_type} in project {project_id}")
            
        except Exception as e:
            logger.error(f"Error logging change: {e}")
    
    def get_change_history(self, project_id: str, limit: int = 100) -> List[ChangeLog]:
        """Get change history for a project"""
        # This would fetch change history from the database
        return []
    
    def tag_version(self, project_id: str, version_number: int, tag: str) -> bool:
        """Add a tag to a version"""
        try:
            version = self.get_version(project_id, version_number)
            if not version:
                return False
            
            if tag not in version.tags:
                version.tags.append(tag)
                
                # Update in database
                conn = self.database.get_connection()
                cursor = conn.cursor()
                
                cursor.execute("""
                    UPDATE version_history 
                    SET tags = ? 
                    WHERE project_id = ? AND version_number = ?
                """, (json.dumps(version.tags), project_id, version_number))
                
                conn.commit()
                conn.close()
                
                logger.info(f"Tag '{tag}' added to version {version_number} of project {project_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error tagging version: {e}")
            return False