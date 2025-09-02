#!/usr/bin/env python3
"""
Test script to verify end-to-end functionality between FinHelm.ai frontend and backend
"""

import requests
import time
import sys

def test_backend():
    """Test if the FastAPI backend is running and responding"""
    print("🔍 Testing FastAPI Backend...")
    
    try:
        # Test health endpoint
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running and healthy")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Backend responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not running or not accessible")
        return False
    except Exception as e:
        print(f"❌ Backend test failed: {e}")
        return False

def test_frontend():
    """Test if the React frontend is running and responding"""
    print("\n🔍 Testing React Frontend...")
    
    try:
        # Test frontend endpoint
        response = requests.get("http://localhost:5173", timeout=5)
        if response.status_code == 200:
            print("✅ Frontend is running and accessible")
            return True
        else:
            print(f"❌ Frontend responded with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Frontend is not running or not accessible")
        return False
    except Exception as e:
        print(f"❌ Frontend test failed: {e}")
        return False

def test_api_endpoints():
    """Test key API endpoints"""
    print("\n🔍 Testing API Endpoints...")
    
    endpoints = [
        ("/", "Root endpoint"),
        ("/docs", "API documentation"),
        ("/auth/quickbooks/oauth-url", "QuickBooks OAuth URL (requires auth)"),
    ]
    
    for endpoint, description in endpoints:
        try:
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
            if response.status_code in [200, 401]:  # 401 is expected for auth endpoints
                print(f"✅ {description}: {response.status_code}")
            else:
                print(f"⚠️  {description}: {response.status_code}")
        except Exception as e:
            print(f"❌ {description}: {e}")

def test_cors():
    """Test CORS configuration"""
    print("\n🔍 Testing CORS Configuration...")
    
    try:
        # Test CORS headers
        response = requests.get("http://localhost:8000/health", timeout=5)
        cors_headers = response.headers.get('Access-Control-Allow-Origin')
        
        if cors_headers:
            print(f"✅ CORS is configured: {cors_headers}")
        else:
            print("⚠️  CORS headers not found")
            
    except Exception as e:
        print(f"❌ CORS test failed: {e}")

def main():
    """Main test function"""
    print("🚀 FinHelm.ai End-to-End Integration Test")
    print("=" * 50)
    
    # Wait a moment for servers to start
    print("⏳ Waiting for servers to start...")
    time.sleep(3)
    
    # Test backend
    backend_ok = test_backend()
    
    # Test frontend
    frontend_ok = test_frontend()
    
    # Test API endpoints if backend is running
    if backend_ok:
        test_api_endpoints()
        test_cors()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    print(f"   Backend (FastAPI): {'✅ Running' if backend_ok else '❌ Not Running'}")
    print(f"   Frontend (React): {'✅ Running' if frontend_ok else '❌ Not Running'}")
    
    if backend_ok and frontend_ok:
        print("\n🎉 SUCCESS: Both servers are running!")
        print("   You can now access:")
        print("   - Frontend: http://localhost:5173")
        print("   - Backend API: http://localhost:8000")
        print("   - API Docs: http://localhost:8000/docs")
        return 0
    else:
        print("\n❌ FAILURE: One or both servers are not running")
        print("   Please check the server logs and try again")
        return 1

if __name__ == "__main__":
    sys.exit(main())
