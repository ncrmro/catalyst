#!/usr/bin/env python3
"""
Project validation script for FastAPI AI Batch Processor.

This script validates the project structure and key components
without requiring external dependencies.
"""

import ast
import os
import sys
from pathlib import Path


def validate_file_exists(file_path: str, description: str) -> bool:
    """Validate that a file exists."""
    if os.path.exists(file_path):
        print(f"✅ {description}: {file_path}")
        return True
    else:
        print(f"❌ {description}: {file_path} (MISSING)")
        return False


def validate_python_syntax(file_path: str, description: str) -> bool:
    """Validate Python file syntax."""
    try:
        with open(file_path, 'r') as f:
            ast.parse(f.read())
        print(f"✅ {description}: Valid syntax")
        return True
    except SyntaxError as e:
        print(f"❌ {description}: Syntax error - {e}")
        return False
    except FileNotFoundError:
        print(f"❌ {description}: File not found")
        return False


def validate_directory_structure() -> bool:
    """Validate the expected directory structure."""
    expected_dirs = [
        "app",
        "app/api",
        "app/api/v1", 
        "app/core",
        "app/crud",
        "app/db",
        "app/models",
        "app/schemas",
        "app/services",
        "scripts",
        "tests",
        "alembic",
        "alembic/versions"
    ]
    
    print("\n📁 Validating directory structure...")
    all_valid = True
    
    for directory in expected_dirs:
        if os.path.isdir(directory):
            print(f"✅ Directory: {directory}")
        else:
            print(f"❌ Directory: {directory} (MISSING)")
            all_valid = False
    
    return all_valid


def validate_key_files() -> bool:
    """Validate that key files exist and have correct syntax."""
    key_files = [
        # Configuration and setup files
        ("README.md", "Project documentation"),
        ("USAGE.md", "Usage documentation"),
        ("requirements.txt", "Python dependencies"),
        ("Dockerfile", "Docker configuration"),
        ("docker-compose.yml", "Docker Compose configuration"),
        (".env.example", "Environment template"),
        (".gitignore", "Git ignore rules"),
        ("alembic.ini", "Alembic configuration"),
        
        # Python application files
        ("app/__init__.py", "App package init"),
        ("app/main.py", "FastAPI main application"),
        ("app/core/config.py", "Application configuration"),
        ("app/models/base.py", "Base database model"),
        ("app/models/batch.py", "Batch processing models"),
        ("app/schemas/batch.py", "Pydantic schemas"),
        ("app/crud/batch.py", "CRUD operations"),
        ("app/services/openai_batch.py", "OpenAI batch service"),
        ("app/api/v1/jobs.py", "API endpoints"),
        ("app/db/session.py", "Database session"),
        
        # Scripts
        ("scripts/batch_processor.py", "Batch processor script"),
        ("scripts/sample_batch_job.py", "Sample job script"),
        
        # Tests
        ("tests/test_main.py", "Main test file"),
        ("tests/conftest.py", "Test configuration"),
        
        # Alembic
        ("alembic/env.py", "Alembic environment"),
        ("alembic/script.py.mako", "Alembic script template"),
    ]
    
    print("\n📄 Validating key files...")
    all_valid = True
    
    for file_path, description in key_files:
        if not validate_file_exists(file_path, description):
            all_valid = False
    
    return all_valid


def validate_python_files() -> bool:
    """Validate Python file syntax."""
    python_files = [
        ("app/main.py", "FastAPI main application"),
        ("app/core/config.py", "Application configuration"),
        ("app/models/base.py", "Base database model"),
        ("app/models/batch.py", "Batch processing models"),
        ("app/schemas/batch.py", "Pydantic schemas"),
        ("app/crud/batch.py", "CRUD operations"),
        ("app/services/openai_batch.py", "OpenAI batch service"),
        ("app/api/v1/jobs.py", "API endpoints"),
        ("app/db/session.py", "Database session"),
        ("scripts/batch_processor.py", "Batch processor script"),
        ("scripts/sample_batch_job.py", "Sample job script"),
        ("tests/test_main.py", "Main test file"),
        ("alembic/env.py", "Alembic environment"),
    ]
    
    print("\n🐍 Validating Python syntax...")
    all_valid = True
    
    for file_path, description in python_files:
        if not validate_python_syntax(file_path, description):
            all_valid = False
    
    return all_valid


def validate_executable_permissions() -> bool:
    """Validate that scripts have executable permissions."""
    executable_files = [
        "scripts/batch_processor.py",
        "scripts/sample_batch_job.py"
    ]
    
    print("\n⚡ Validating executable permissions...")
    all_valid = True
    
    for file_path in executable_files:
        if os.path.exists(file_path):
            if os.access(file_path, os.X_OK):
                print(f"✅ Executable: {file_path}")
            else:
                print(f"⚠️  Not executable: {file_path} (consider: chmod +x {file_path})")
        else:
            print(f"❌ File not found: {file_path}")
            all_valid = False
    
    return all_valid


def validate_content_samples() -> bool:
    """Validate that key files contain expected content."""
    print("\n📝 Validating file content...")
    
    # Check if requirements.txt has key dependencies
    try:
        with open("requirements.txt", 'r') as f:
            requirements_content = f.read()
        
        required_packages = ["fastapi", "sqlalchemy", "alembic", "openai", "pydantic"]
        missing_packages = []
        
        for package in required_packages:
            if package.lower() not in requirements_content.lower():
                missing_packages.append(package)
        
        if missing_packages:
            print(f"⚠️  Missing packages in requirements.txt: {missing_packages}")
        else:
            print("✅ Requirements.txt contains all key packages")
    
    except FileNotFoundError:
        print("❌ requirements.txt not found")
        return False
    
    # Check if .env.example has key variables
    try:
        with open(".env.example", 'r') as f:
            env_content = f.read()
        
        required_vars = ["DATABASE_URL", "OPENAI_API_KEY"]
        missing_vars = []
        
        for var in required_vars:
            if var not in env_content:
                missing_vars.append(var)
        
        if missing_vars:
            print(f"⚠️  Missing variables in .env.example: {missing_vars}")
        else:
            print("✅ .env.example contains all key variables")
    
    except FileNotFoundError:
        print("❌ .env.example not found")
        return False
    
    return True


def main():
    """Main validation function."""
    print("🔍 FastAPI AI Batch Processor - Project Validation")
    print("=" * 50)
    
    # Change to the script's directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    print(f"📍 Validating project in: {os.getcwd()}")
    
    # Run all validations
    validations = [
        ("Directory Structure", validate_directory_structure),
        ("Key Files", validate_key_files),
        ("Python Syntax", validate_python_files),
        ("Executable Permissions", validate_executable_permissions),
        ("Content Samples", validate_content_samples),
    ]
    
    all_passed = True
    results = {}
    
    for name, validator in validations:
        try:
            results[name] = validator()
            if not results[name]:
                all_passed = False
        except Exception as e:
            print(f"❌ {name}: Validation failed with error: {e}")
            results[name] = False
            all_passed = False
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 VALIDATION SUMMARY")
    print("=" * 50)
    
    for name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{name:25} {status}")
    
    print("=" * 50)
    
    if all_passed:
        print("🎉 ALL VALIDATIONS PASSED!")
        print("\nThe FastAPI AI Batch Processor project structure is valid.")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Set up environment: cp .env.example .env")
        print("3. Configure database and OpenAI API key in .env")
        print("4. Run migrations: alembic upgrade head")
        print("5. Start the server: uvicorn app.main:app --reload")
        return 0
    else:
        print("❌ SOME VALIDATIONS FAILED!")
        print("\nPlease fix the issues above before proceeding.")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)