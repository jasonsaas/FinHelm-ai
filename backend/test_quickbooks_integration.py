#!/usr/bin/env python3

import requests
import json
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def test_quickbooks_service():
    """Test QuickBooks service directly"""
    print("Testing QuickBooks service...")

    try:
        from app.services.quickbooks_service import QuickBooksService
        from app.core.config import settings

        qb_service = QuickBooksService()

        # Test authorization URL generation
        print("✓ Testing authorization URL generation...")
        auth_url = qb_service.get_authorization_url(state="test_state")
        print(f"✓ Authorization URL generated: {auth_url[:100]}...")

        # Test configuration
        print(f"✓ Client ID: {settings.qbo_client_id}")
        print(f"✓ Environment: {settings.qbo_environment}")
        print(f"✓ Redirect URI: {settings.qbo_redirect_uri}")
        print(f"✓ Scope: {settings.qbo_scope}")

        return True

    except Exception as e:
        print(f"✗ QuickBooks service test failed: {e}")
        return False


def test_backend_endpoints():
    """Test backend endpoints if server is running"""
    print("\nTesting backend endpoints...")

    base_url = "http://localhost:8000"

    # Test health endpoint
    try:
        print("✓ Testing health endpoint...")
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✓ Health endpoint working")
            health_data = response.json()
            print(f"✓ Status: {health_data.get('status')}")
            print(f"✓ Version: {health_data.get('version')}")
        else:
            print(f"✗ Health endpoint returned {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Backend server not running on localhost:8000")
        print(
            "  Start the server with: python3 -m uvicorn main:app --reload --port 8000"
        )
        return False
    except Exception as e:
        print(f"✗ Health endpoint test failed: {e}")
        return False

    # Test QuickBooks OAuth URL endpoint (requires authentication)
    try:
        print("✓ Testing QuickBooks OAuth URL endpoint...")
        response = requests.get(f"{base_url}/auth/quickbooks/oauth-url", timeout=5)
        if response.status_code == 401:
            print("✓ OAuth endpoint requires authentication (expected)")
        elif response.status_code == 200:
            print("✓ OAuth endpoint working")
            oauth_data = response.json()
            print(
                f"✓ Authorization URL: {oauth_data.get('authorization_url', '')[:100]}..."
            )
        else:
            print(f"✗ OAuth endpoint returned {response.status_code}")
    except Exception as e:
        print(f"✗ OAuth endpoint test failed: {e}")

    return True


def test_frontend_integration():
    """Test frontend integration points"""
    print("\nTesting frontend integration...")

    # Check if frontend is running
    try:
        print("✓ Testing frontend connection...")
        response = requests.get("http://localhost:5173", timeout=5)
        if response.status_code == 200:
            print("✓ Frontend is running on localhost:5173")
        else:
            print(f"✗ Frontend returned {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("✗ Frontend not running on localhost:5173")
        print("  Start the frontend with: cd finhelm-ai-navigator && npm run dev")
    except Exception as e:
        print(f"✗ Frontend test failed: {e}")

    # Check callback route
    try:
        print("✓ Testing callback route...")
        response = requests.get(
            "http://localhost:5173/auth/quickbooks/callback", timeout=5
        )
        if response.status_code == 200:
            print("✓ Callback route is accessible")
        else:
            print(f"✗ Callback route returned {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("✗ Frontend not running")
    except Exception as e:
        print(f"✗ Callback route test failed: {e}")


def main():
    print("=== QuickBooks Integration Test ===\n")

    # Test QuickBooks service
    service_ok = test_quickbooks_service()

    # Test backend endpoints
    backend_ok = test_backend_endpoints()

    # Test frontend integration
    test_frontend_integration()

    print("\n=== Test Summary ===")
    print(f"QuickBooks Service: {'✓ PASS' if service_ok else '✗ FAIL'}")
    print(f"Backend Endpoints: {'✓ PASS' if backend_ok else '✗ FAIL'}")

    if service_ok and backend_ok:
        print("\n🎉 QuickBooks integration is working!")
        print("\nNext steps:")
        print("1. Start the backend: python3 -m uvicorn main:app --reload --port 8000")
        print("2. Start the frontend: cd finhelm-ai-navigator && npm run dev")
        print("3. Navigate to http://localhost:5173/dashboard")
        print("4. Click 'Connect with QuickBooks' button")
    else:
        print("\n❌ Some tests failed. Please fix the issues above.")

        if not service_ok:
            print("\n💡 QuickBooks service issues:")
            print("   - Check QuickBooks credentials in .env file")
            print("   - Verify QuickBooks app configuration")

        if not backend_ok:
            print("\n💡 Backend issues:")
            print("   - Start the backend server")
            print("   - Check for any startup errors")


if __name__ == "__main__":
    main()
