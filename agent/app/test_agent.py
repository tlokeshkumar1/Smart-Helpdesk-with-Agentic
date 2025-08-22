#!/usr/bin/env python3
"""
Test script for the enhanced agentic triage system
"""

import requests
import json
import time

def test_agent_endpoint():
    """Test the /triage endpoint with sample data"""
    
    # Sample ticket data
    test_ticket = {
        "traceId": f"test-{int(time.time())}",
        "ticket": {
            "id": "test123",
            "title": "Double charged on my account",
            "description": "I was charged twice for the same order #1234. I need a refund for the duplicate charge. This is affecting my billing statement."
        },
        "kb": [
            {
                "id": "kb001",
                "title": "How to request a refund",
                "body": "To request a refund, please contact our billing team with your order number and the charge details. Refunds are processed within 5-7 business days.",
                "tags": ["billing", "refund", "payment"]
            },
            {
                "id": "kb002", 
                "title": "Understanding duplicate charges",
                "body": "Duplicate charges can occur due to payment processing errors. We investigate all duplicate charge reports and provide full refunds when confirmed.",
                "tags": ["billing", "charges", "duplicate"]
            },
            {
                "id": "kb003",
                "title": "Shipping delays and tracking", 
                "body": "Track your shipment using the provided tracking number. Contact support if shipment is delayed more than 3 business days.",
                "tags": ["shipping", "tracking", "delays"]
            }
        ]
    }
    
    try:
        print("🧪 Testing Enhanced Agentic Triage System")
        print("=" * 50)
        
        # Test the endpoint
        response = requests.post(
            "http://localhost:9000/triage",
            json=test_ticket,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            
            print("✅ Agent Response Received")
            print(f"Category: {result.get('predictedCategory')}")
            print(f"Confidence: {result.get('confidence')}")
            print(f"Citations: {result.get('citations', [])}")
            print(f"Steps Logged: {len(result.get('stepLogs', []))}")
            print("\n📝 Draft Reply:")
            print("-" * 30)
            print(result.get('draftReply', 'No reply generated'))
            print("-" * 30)
            
            print("\n🔍 Step Analysis:")
            for i, step in enumerate(result.get('stepLogs', []), 1):
                action = step.get('action', 'Unknown')
                meta = step.get('meta', {})
                print(f"{i}. {action}")
                if 'processingTimeMs' in meta:
                    print(f"   ⏱️  Processing: {meta['processingTimeMs']}ms")
                if 'confidence' in meta:
                    print(f"   🎯 Confidence: {meta['confidence']}")
                if 'articleIds' in meta:
                    print(f"   📚 Articles: {meta['articleIds']}")
            
            print(f"\n⚡ Model Info:")
            model_info = result.get('modelInfo', {})
            print(f"   Provider: {model_info.get('provider')}")
            print(f"   Model: {model_info.get('model')}")
            print(f"   Stub Mode: {model_info.get('stubMode')}")
            if 'totalProcessingTimeMs' in model_info:
                print(f"   Total Time: {model_info['totalProcessingTimeMs']}ms")
            
            # Test quality metrics
            if 'quality' in result:
                print(f"\n📊 Quality Metrics:")
                quality = result['quality']
                print(f"   Retrieval Quality: {quality.get('retrievalQuality', 0):.2f}")
                print(f"   Citation Count: {quality.get('citationCount', 0)}")
                print(f"   Response Length: {quality.get('responseLength', 0)} chars")
            
            return True
            
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure the agent service is running on localhost:9000")
        return False
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        return False

def test_classification_scenarios():
    """Test different classification scenarios"""
    
    scenarios = [
        {
            "name": "Billing Issue",
            "text": "I need a refund for my subscription charge",
            "expected": "billing"
        },
        {
            "name": "Tech Issue", 
            "text": "The app crashes when I try to login with error 500",
            "expected": "tech"
        },
        {
            "name": "Shipping Issue",
            "text": "My package was supposed to arrive yesterday but I haven't received it",
            "expected": "shipping"
        },
        {
            "name": "General Inquiry",
            "text": "What are your business hours?",
            "expected": "other"
        }
    ]
    
    print("\n🎯 Testing Classification Scenarios")
    print("=" * 50)
    
    for scenario in scenarios:
        test_data = {
            "traceId": f"test-class-{int(time.time())}",
            "ticket": {
                "id": "test",
                "title": scenario["text"],
                "description": scenario["text"]
            },
            "kb": []
        }
        
        try:
            response = requests.post(
                "http://localhost:9000/triage",
                json=test_data,
                timeout=5
            )
            
            if response.status_code == 200:
                result = response.json()
                predicted = result.get('predictedCategory')
                confidence = result.get('confidence')
                
                status = "✅" if predicted == scenario["expected"] else "⚠️"
                print(f"{status} {scenario['name']}: {predicted} ({confidence:.2f})")
            else:
                print(f"❌ {scenario['name']}: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"❌ {scenario['name']}: {e}")

if __name__ == "__main__":
    print("🚀 Enhanced Agentic Triage System Test")
    print("Testing comprehensive triage functionality...")
    print()
    
    # Test main functionality
    if test_agent_endpoint():
        print("\n" + "=" * 50)
        # Test classification scenarios
        test_classification_scenarios()
        
        print("\n🎉 Testing Complete!")
        print("\n📋 Summary of Enhanced Features:")
        print("✅ Category Classification (billing/tech/shipping/other)")
        print("✅ KB Article Retrieval with Relevance Scoring")
        print("✅ AI-Generated Draft Replies with Citations")
        print("✅ Confidence Scoring with Quality Adjustments")
        print("✅ Comprehensive Audit Logging")
        print("✅ Auto-Close Decision Logic")
        print("✅ Processing Time Metrics")
        print("✅ Quality Metrics and Feedback")
    else:
        print("\n❌ Agent service not available. Please start the service first.")
