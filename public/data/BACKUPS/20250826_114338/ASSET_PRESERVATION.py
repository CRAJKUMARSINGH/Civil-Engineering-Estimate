"""
Asset Preservation Script for Raj Estimator
Ensures all files in Attached_assets are preserved, catalogued, and integrated
"""

import os
import json
import shutil
from pathlib import Path
from datetime import datetime
import hashlib

class AssetPreservation:
    """Preserve and organize all critical assets"""
    
    def __init__(self, assets_dir="Attached_assets"):
        self.assets_dir = Path(assets_dir)
        self.catalog = {}
        self.critical_files = [
            "BAR WING PP WING.xls",
            "Building_BSR_2022_FINAL_30.9.2022.pdf", 
            "CHTGPT_GUIDANCE.txt",
            "COURT BLDG NTD.xls",
            "Noteworthy GitHub Repositories.md",
            "Raj_estimator.md",
            "ACTION_PLAN.md"
        ]
    
    def calculate_file_hash(self, file_path):
        """Calculate SHA256 hash of file for integrity checking"""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    
    def catalog_assets(self):
        """Create comprehensive catalog of all assets"""
        if not self.assets_dir.exists():
            print(f"Warning: Assets directory {self.assets_dir} does not exist")
            return
        
        for file_path in self.assets_dir.rglob("*"):
            if file_path.is_file():
                relative_path = file_path.relative_to(self.assets_dir)
                stat = file_path.stat()
                
                file_info = {
                    'name': file_path.name,
                    'full_path': str(file_path.absolute()),
                    'relative_path': str(relative_path),
                    'size_bytes': stat.st_size,
                    'size_mb': round(stat.st_size / (1024*1024), 2),
                    'created': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'extension': file_path.suffix.lower(),
                    'is_critical': file_path.name in self.critical_files,
                    'file_hash': self.calculate_file_hash(file_path),
                    'description': self.get_file_description(file_path.name)
                }
                
                self.catalog[str(relative_path)] = file_info
        
        # Save catalog
        catalog_file = self.assets_dir / "ASSET_CATALOG.json"
        with open(catalog_file, 'w', encoding='utf-8') as f:
            json.dump(self.catalog, f, indent=2, ensure_ascii=False)
        
        print(f"Catalogued {len(self.catalog)} assets")
        return self.catalog
    
    def get_file_description(self, filename):
        """Get description for known files"""
        descriptions = {
            "BAR WING PP WING.xls": "Building rate analysis - Bar and Wing construction data",
            "Building_BSR_2022_FINAL_30.9.2022.pdf": "Building Standard Rates 2022 - Official rate schedule",
            "CHTGPT_GUIDANCE.txt": "ChatGPT guidance and instructions for development",
            "COURT BLDG NTD.xls": "Court building estimation data and rates",
            "Noteworthy GitHub Repositories.md": "List of relevant GitHub repositories including GEstimator",
            "Raj_estimator.md": "Project requirements and deliberation document",
            "ACTION_PLAN.md": "Comprehensive action plan for project implementation"
        }
        return descriptions.get(filename, "Asset file for estimation project")
    
    def create_backup(self):
        """Create backup of all critical assets"""
        backup_dir = self.assets_dir / "BACKUPS" / datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        backed_up = 0
        for file_path in self.assets_dir.rglob("*"):
            if file_path.is_file() and "BACKUPS" not in str(file_path):
                relative_path = file_path.relative_to(self.assets_dir)
                backup_file = backup_dir / relative_path
                backup_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(file_path, backup_file)
                backed_up += 1
        
        print(f"Created backup of {backed_up} files in {backup_dir}")
        return backup_dir
    
    def verify_critical_files(self):
        """Verify all critical files are present"""
        missing_files = []
        present_files = []
        
        for critical_file in self.critical_files:
            file_path = self.assets_dir / critical_file
            if file_path.exists():
                present_files.append(critical_file)
            else:
                missing_files.append(critical_file)
        
        print(f"\nCritical Files Status:")
        print(f"Present ({len(present_files)}): {present_files}")
        if missing_files:
            print(f"Missing ({len(missing_files)}): {missing_files}")
        
        return len(missing_files) == 0
    
    def generate_asset_report(self):
        """Generate comprehensive asset report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_files': len(self.catalog),
            'total_size_mb': sum(info['size_mb'] for info in self.catalog.values()),
            'critical_files_present': self.verify_critical_files(),
            'file_types': {},
            'critical_files': [],
            'all_files': list(self.catalog.keys())
        }
        
        # Analyze file types
        for file_info in self.catalog.values():
            ext = file_info['extension'] or 'no_extension'
            if ext not in report['file_types']:
                report['file_types'][ext] = {'count': 0, 'size_mb': 0}
            report['file_types'][ext]['count'] += 1
            report['file_types'][ext]['size_mb'] += file_info['size_mb']
        
        # List critical files
        for path, info in self.catalog.items():
            if info['is_critical']:
                report['critical_files'].append({
                    'name': info['name'],
                    'path': path,
                    'size_mb': info['size_mb'],
                    'description': info['description']
                })
        
        # Save report
        report_file = self.assets_dir / "ASSET_REPORT.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        return report
    
    def preserve_all_assets(self):
        """Main function to preserve all assets"""
        print("Starting Asset Preservation Process...")
        
        # Step 1: Catalog all assets
        self.catalog_assets()
        
        # Step 2: Verify critical files
        all_critical_present = self.verify_critical_files()
        
        # Step 3: Create backup
        backup_dir = self.create_backup()
        
        # Step 4: Generate report
        report = self.generate_asset_report()
        
        print(f"\nAsset Preservation Complete!")
        print(f"Total files: {report['total_files']}")
        print(f"Total size: {report['total_size_mb']:.2f} MB")
        print(f"Critical files present: {all_critical_present}")
        print(f"Backup created: {backup_dir}")
        
        return {
            'catalog': self.catalog,
            'report': report,
            'backup_dir': str(backup_dir),
            'all_critical_present': all_critical_present
        }

if __name__ == "__main__":
    # Run asset preservation
    preservation = AssetPreservation()
    result = preservation.preserve_all_assets()
    
    print("\n" + "="*50)
    print("ASSET PRESERVATION SUMMARY")
    print("="*50)
    print(f"Files catalogued: {len(result['catalog'])}")
    print(f"Total size: {result['report']['total_size_mb']:.2f} MB")
    print(f"All critical files present: {result['all_critical_present']}")
    print(f"Backup location: {result['backup_dir']}")
    print("\nAll assets are preserved and ready for integration!")
