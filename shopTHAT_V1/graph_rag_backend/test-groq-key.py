#!/usr/bin/env python3
"""
Simple test script to verify GROQ API key is working
"""

import os
import requests
from dotenv import load_dotenv

def test_groq_api():
    # Load environment variables
    load_dotenv()
    
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("❌ GROQ_API_KEY not found in environment")
        return False
    
    print(f"✅ GROQ API Key found: {api_key[:10]}...")
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {"role": "user", "content": "Hello, this is a test message."}
        ],
        "max_tokens": 50
    }
    
    try:
        print("🔄 Testing GROQ API connection...")
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if resp.status_code == 200:
            response_text = resp.json()["choices"][0]["message"]["content"]
            print(f"✅ GROQ API working! Response: {response_text}")
            return True
        else:
            print(f"❌ GROQ API error: {resp.status_code} - {resp.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing GROQ API: {str(e)}")
        return False

if __name__ == "__main__":
    print("🧪 Testing GROQ API Key...")
    test_groq_api() 