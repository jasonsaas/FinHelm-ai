#!/usr/bin/env python3
"""
QuickBooks Configuration Test Script
Tests the QuickBooks OAuth configuration and URL generation
"""

import requests
import json
from urllib.parse import urlparse

def test_quickbooks_config():
    """Test QuickBooks configuration and endpoints"""
    
    print("🔍 QuickBooks Configuration Test")
    print("=" * 50)
    
    # Test 1: Check if backend is running
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
        else:
            print(f"⚠️  Backend responded with status: {response.status_code}")
    except Exception as e:
        print(f"❌ Backend is not accessible: {e}")
        return
    
    # Test 2: Check QuickBooks endpoints (without auth)
    endpoints = [
        "/auth/quickbooks/oauth-url",
        "/auth/quickbooks/status",
        "/auth/quickbooks/disconnect"
    ]
    
    print("\n🔍 Testing QuickBooks Endpoints (without authentication):")
    for endpoint in endpoints:
        try:
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
            if response.status_code == 401:
                print(f"✅ {endpoint}: Requires authentication (expected)")
            elif response.status_code == 403:
                print(f"✅ {endpoint}: Forbidden (expected)")
            else:
                print(f"⚠️  {endpoint}: Unexpected status {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint}: Error - {e}")
    
    # Test 3: Check API documentation
    try:
        response = requests.get("http://localhost:8000/docs", timeout=5)
        if response.status_code == 200:
            print("\n✅ API documentation is accessible")
            print("   📖 Visit: http://localhost:8000/docs")
        else:
            print(f"\n⚠️  API documentation status: {response.status_code}")
    except Exception as e:
        print(f"\n❌ API documentation error: {e}")
    
    # Test 4: Check frontend
    try:
        response = requests.get("http://localhost:5173", timeout=5)
        if response.status_code == 200:
            print("✅ Frontend is running")
            print("   🌐 Visit: http://localhost:5173")
        else:
            print(f"⚠️  Frontend status: {response.status_code}")
    except Exception as e:
        print(f"❌ Frontend is not accessible: {e}")
    
    print("\n" + "=" * 50)
    print("📋 Next Steps:")
    print("1. Create QuickBooks Developer account at: https://developer.intuit.com/")
    print("2. Create a new app with OAuth 2.0")
    print("3. Set redirect URI to: http://localhost:5173/auth/quickbooks/callback")
    print("4. Update your .env file with Client ID and Secret")
    print("5. Test the OAuth flow through the frontend")
    print("\n📖 See QUICKBOOKS_SETUP_GUIDE.md for detailed instructions")

if __name__ == "__main__":
    test_quickbooks_config()
