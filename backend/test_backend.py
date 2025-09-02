#!/usr/bin/env python3

import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def test_imports():
    """Test if all required modules can be imported"""
    print("Testing imports...")

    try:
        print("✓ Importing FastAPI...")
        from fastapi import FastAPI

        print("✓ FastAPI imported successfully")
    except ImportError as e:
        print(f"✗ FastAPI import failed: {e}")
        return False

    try:
        print("✓ Importing config...")
        from app.core.config import settings

        print("✓ Config imported successfully")
    except ImportError as e:
        print(f"✗ Config import failed: {e}")
        return False

    try:
        print("✓ Importing database...")
        from app.db.database import engine, get_db

        print("✓ Database imported successfully")
    except ImportError as e:
        print(f"✗ Database import failed: {e}")
        return False

    try:
        print("✓ Importing models...")
        from app.db import models, schemas

        print("✓ Models imported successfully")
    except ImportError as e:
        print(f"✗ Models import failed: {e}")
        return False

    try:
        print("✓ Importing security...")
        from app.core.security import (
            create_access_token,
            verify_token,
            hash_password,
            verify_password,
            generate_session_token,
        )

        print("✓ Security imported successfully")
    except ImportError as e:
        print(f"✗ Security import failed: {e}")
        return False

    try:
        print("✓ Importing QuickBooks service...")
        from app.services.quickbooks_service import QuickBooksService

        print("✓ QuickBooks service imported successfully")
    except ImportError as e:
        print(f"✗ QuickBooks service import failed: {e}")
        print("  This might be due to missing requests-oauthlib dependency")
        return False

    try:
        print("✓ Importing Grok service...")
        from app.services.grok_service import GrokService

        print("✓ Grok service imported successfully")
    except ImportError as e:
        print(f"✗ Grok service import failed: {e}")
        return False

    try:
        print("✓ Importing finance agent...")
        from app.agents.finance_agent import FinanceAgent

        print("✓ Finance agent imported successfully")
    except ImportError as e:
        print(f"✗ Finance agent import failed: {e}")
        return False

    return True


def test_config():
    """Test configuration loading"""
    print("\nTesting configuration...")

    try:
        from app.core.config import settings

        print(f"✓ App name: {settings.app_name}")
        print(f"✓ Debug mode: {settings.debug}")
        print(f"✓ Database URL: {settings.database_url}")
        print(f"✓ QuickBooks Client ID: {settings.qbo_client_id}")
        print(f"✓ QuickBooks Environment: {settings.qbo_environment}")
        print(f"✓ QuickBooks Redirect URI: {settings.qbo_redirect_uri}")
        return True
    except Exception as e:
        print(f"✗ Configuration test failed: {e}")
        return False


def test_database():
    """Test database connection"""
    print("\nTesting database...")

    try:
        from app.db.database import engine
        from app.db import models

        # Create tables
        models.Base.metadata.create_all(bind=engine)
        print("✓ Database tables created successfully")
        return True
    except Exception as e:
        print(f"✗ Database test failed: {e}")
        return False


if __name__ == "__main__":
    print("=== Backend Import Test ===\n")

    imports_ok = test_imports()
    config_ok = test_config()
    db_ok = test_database()

    print("\n=== Test Results ===")
    print(f"Imports: {'✓ PASS' if imports_ok else '✗ FAIL'}")
    print(f"Config:  {'✓ PASS' if config_ok else '✗ FAIL'}")
    print(f"Database: {'✓ PASS' if db_ok else '✗ FAIL'}")

    if imports_ok and config_ok and db_ok:
        print("\n🎉 All tests passed! Backend should start successfully.")
    else:
        print("\n❌ Some tests failed. Please fix the issues above.")
        if not imports_ok:
            print("\n💡 Try installing missing dependencies:")
            print("   pip install requests-oauthlib")
