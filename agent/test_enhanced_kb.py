#!/usr/bin/env python3
"""
Test script for enhanced KB matching and formatted response generation
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from pipeline import run_pipeline
from search import top_k, get_best_kb_match, calculate_relevance_score
import json

# Sample KB articles for testing
SAMPLE_KB = [
    {
        "id": "KB001",
        "title": "How to Update Your Payment Method",
        "body": """To update your payment method in your account:

1. **Log in** to your account dashboard
2. **Click on "Billing"** in the navigation menu
3. **Select "Payment Methods"** from the sidebar
4. **Click "Add New Payment Method"** or edit existing one
5. **Enter your new card details** including card number, expiry, and CVV
6. **Verify the billing address** matches your card
7. **Click "Save Changes"** to update your payment method
8. **Test the new payment method** by making a small transaction

Important: Your old payment method will remain active until you remove it manually.""",
        "tags": ["billing", "payment", "credit card", "account", "update"],
        "status": "published",
        "updatedAt": "2024-01-15"
    },
    {
        "id": "KB002", 
        "title": "Troubleshooting Login Issues",
        "body": """If you're having trouble logging into your account:

1. **Verify your email address** is spelled correctly
2. **Check your password** and ensure caps lock is off
3. **Try resetting your password** using the "Forgot Password" link
4. **Clear your browser cache** and cookies
5. **Disable browser extensions** that might interfere
6. **Try using an incognito/private browser window**
7. **Check if your account is locked** due to multiple failed attempts
8. **Contact support** if the issue persists

Note: Account lockouts automatically expire after 30 minutes.""",
        "tags": ["login", "password", "authentication", "troubleshooting", "account"],
        "status": "published",
        "updatedAt": "2024-01-10"
    },
    {
        "id": "KB003",
        "title": "Setting Up Two-Factor Authentication", 
        "body": """To enable two-factor authentication for enhanced security:

1. **Go to Account Settings** from your profile menu
2. **Click on "Security"** tab
3. **Find "Two-Factor Authentication"** section
4. **Download an authenticator app** (Google Authenticator, Authy, etc.)
5. **Scan the QR code** with your authenticator app
6. **Enter the 6-digit verification code** from your app
7. **Save your backup codes** in a secure location
8. **Click "Enable 2FA"** to activate

Remember: Keep your backup codes safe as they're your only way to recover access if you lose your phone.""",
        "tags": ["security", "2fa", "authentication", "setup", "account"],
        "status": "published",
        "updatedAt": "2024-01-12"
    },
    {
        "id": "KB004",
        "title": "How to Cancel Your Subscription",
        "body": """To cancel your subscription:

1. **Log into your account** 
2. **Navigate to "Billing & Subscriptions"**
3. **Find your active subscription**
4. **Click "Manage Subscription"**
5. **Select "Cancel Subscription"**
6. **Choose your cancellation reason** from the dropdown
7. **Confirm the cancellation** by clicking "Yes, Cancel"
8. **Save confirmation email** for your records

Your subscription will remain active until the end of your current billing period.""",
        "tags": ["subscription", "cancel", "billing", "account"],
        "status": "published",
        "updatedAt": "2024-01-08"
    }
]

# Test cases with different types of customer requests
TEST_CASES = [
    {
        "title": "Can't update my credit card",
        "description": "I'm trying to update my payment method but the page keeps giving me errors. My card expires next month and I need to update it before my next billing cycle.",
        "expected_kb": "KB001"
    },
    {
        "title": "Password reset not working",
        "description": "I've tried resetting my password multiple times but I'm not receiving the reset email. I've checked my spam folder too. Can you help?",
        "expected_kb": "KB002"
    },
    {
        "title": "Security setup question",
        "description": "I want to make my account more secure. Can you guide me through setting up two-factor authentication?",
        "expected_kb": "KB003"
    },
    {
        "title": "Cancel my monthly plan",
        "description": "I need to cancel my subscription. I won't be using the service anymore. How do I do this?",
        "expected_kb": "KB004"
    },
    {
        "title": "Billing issue with charge",
        "description": "I see a charge on my card but I thought I cancelled my subscription last month. Can you help me understand what happened?",
        "expected_kb": "KB004"  # Should match cancellation article
    }
]

def test_kb_matching():
    """Test the enhanced KB matching functionality"""
    print("=== Testing Enhanced KB Matching ===\n")
    
    for i, test_case in enumerate(TEST_CASES, 1):
        print(f"Test Case {i}: {test_case['title']}")
        print(f"Description: {test_case['description']}")
        
        # Combine title and description for search
        query = f"{test_case['title']} {test_case['description']}"
        
        # Test enhanced search
        results = top_k(query, SAMPLE_KB, k=3)
        
        print(f"Search Results:")
        for j, (article, score) in enumerate(results, 1):
            print(f"  {j}. {article['title']} (ID: {article['id']}) - Score: {score:.2f}")
        
        # Check if best match is expected
        if results:
            best_match = results[0][0]
            best_score = results[0][1]
            is_correct = best_match['id'] == test_case['expected_kb']
            status = "✓ CORRECT" if is_correct else "✗ INCORRECT"
            print(f"  Best Match: {best_match['id']} {status}")
            print(f"  Relevance Score: {best_score:.2f}")
        else:
            print("  No matches found")
        
        print()

def test_response_generation():
    """Test the enhanced response generation with formatting"""
    print("=== Testing Enhanced Response Generation ===\n")
    
    for i, test_case in enumerate(TEST_CASES, 1):
        print(f"Test Case {i}: {test_case['title']}")
        print("-" * 50)
        
        # Create ticket object
        ticket = {
            "id": f"TICKET-{i:03d}",
            "title": test_case['title'],
            "description": test_case['description']
        }
        
        # Run the enhanced pipeline
        result = run_pipeline(f"test-{i}", ticket, SAMPLE_KB)
        
        print(f"Predicted Category: {result['predictedCategory']}")
        print(f"Confidence: {result['confidence']:.3f}")
        print(f"Citations: {result['citations']}")
        print(f"Quality Metrics:")
        print(f"  - Retrieval Quality: {result['quality']['retrievalQuality']:.3f}")
        print(f"  - Draft Quality: {result['quality']['draftQuality']:.3f}")
        print(f"  - Citation Count: {result['quality']['citationCount']}")
        print(f"  - Response Length: {result['quality']['responseLength']}")
        print()
        print("Generated Response:")
        print("-" * 30)
        print(result['draftReply'])
        print("-" * 30)
        print()
        
        # Check formatting requirements
        response = result['draftReply']
        formatting_checks = {
            "Has Greeting": any(greeting in response for greeting in ["Hello", "Hi", "Dear"]),
            "Has Numbered List": any(f"{i}." in response for i in range(1, 10)),
            "Has Bold Formatting": "**" in response,
            "Has Note Section": "Note:" in response,
            "Has Closing": any(closing in response for closing in ["Best regards", "Sincerely"]),
            "Has Citation": "[Article #" in response
        }
        
        print("Formatting Check:")
        for check, passed in formatting_checks.items():
            status = "✓" if passed else "✗"
            print(f"  {status} {check}")
        
        print("\n" + "="*80 + "\n")

def test_individual_features():
    """Test individual components of the enhanced system"""
    print("=== Testing Individual Features ===\n")
    
    # Test enhanced scoring
    query = "update my payment method"
    print(f"Query: '{query}'")
    print("Relevance Scores:")
    
    for article in SAMPLE_KB:
        score = calculate_relevance_score(query, article)
        print(f"  {article['title']} (ID: {article['id']}): {score:.2f}")
    
    print()
    
    # Test best match selection
    best_article = get_best_kb_match(query, SAMPLE_KB)
    if best_article:
        print(f"Best Match: {best_article['title']} (ID: {best_article['id']})")
    else:
        print("No best match found")

if __name__ == "__main__":
    print("Enhanced KB Matching and Response Generation Test")
    print("=" * 60)
    print()
    
    # Run all tests
    test_individual_features()
    print()
    test_kb_matching() 
    print()
    test_response_generation()
    
    print("Testing completed!")
