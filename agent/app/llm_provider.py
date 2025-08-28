from typing import List, Dict
import google.generativeai as genai
from config import settings

# Configure Gemini if API key is available
if settings.GEMINI_API_KEY and not settings.STUB_MODE:
    genai.configure(api_key=settings.GEMINI_API_KEY)

BILLING = {"refund", "invoice", "charge", "card", "payment", "billing"}
TECH = {"error", "bug", "stack", "crash", "login", "auth", "trace"}
SHIP = {"delivery", "shipment", "shipping", "package", "track", "courier", "delayed"}

class LLMProvider:
    def classify(self, text: str) -> Dict:
        """
        Classify ticket text into categories with confidence score.
        Returns: { "predictedCategory": "billing|tech|shipping|other", "confidence": 0.0-1.0 }
        """
        if settings.STUB_MODE:
            # Enhanced deterministic classification for stub mode
            t = text.lower()
            score = {"billing": 0, "tech": 0, "shipping": 0, "other": 0}
            
            # Primary keyword matching with weighted scoring
            for word in BILLING: 
                if word in t:
                    # Count exact matches and partial matches
                    exact_count = t.count(word)
                    score["billing"] += exact_count * 3  # Higher weight for exact matches
                    
            for word in TECH: 
                if word in t:
                    exact_count = t.count(word)
                    score["tech"] += exact_count * 3
                    
            for word in SHIP: 
                if word in t:
                    exact_count = t.count(word)
                    score["shipping"] += exact_count * 3
            
            # Secondary indicators with lower weights
            billing_indicators = ["money", "cost", "price", "subscription", "account", "plan", "charged", "fee", "transaction"]
            tech_indicators = ["broken", "not working", "cannot", "can't", "issue", "problem", "fix", "support", "help"]
            shipping_indicators = ["order", "product", "item", "received", "arrive", "delivery", "package", "sent"]
            
            for indicator in billing_indicators:
                if indicator in t:
                    score["billing"] += t.count(indicator)
                    
            for indicator in tech_indicators:
                if indicator in t:
                    score["tech"] += t.count(indicator)
                    
            for indicator in shipping_indicators:
                if indicator in t:
                    score["shipping"] += t.count(indicator)
            
            # Determine winning category
            max_score = max(score.values())
            if max_score == 0:
                return {"predictedCategory": "other", "confidence": 0.3}
            
            winning_category = max(score, key=score.get)
            
            # Enhanced confidence calculation based on:
            # 1. Keyword density relative to text length
            # 2. Score margin over other categories  
            # 3. Absolute score threshold
            text_words = len(t.split())
            keyword_density = max_score / max(1, text_words)
            
            # Base confidence from keyword density
            confidence_base = min(0.9, keyword_density * 2)
            
            # Boost for clear margin over other categories
            other_scores = [score[cat] for cat in score if cat != winning_category]
            if other_scores:
                max_other = max(other_scores)
                margin = (max_score - max_other) / max(1, max_score)
                confidence_base += margin * 0.3
            
            # Boost for multiple strong indicators
            if max_score >= 5:
                confidence_base += 0.2
            elif max_score >= 3:
                confidence_base += 0.1
            
            # Ensure confidence is in valid range
            final_confidence = max(0.3, min(0.95, confidence_base))
            
            return {
                "predictedCategory": winning_category, 
                "confidence": round(final_confidence, 3)
            }
        
        # Real Gemini classification with enhanced prompting
        try:
            prompt = f"""You are an expert customer support ticket classifier. Analyze the following ticket and classify it into one of these categories:

**Categories:**
- billing: Payment issues, refunds, invoices, charges, subscription problems, account billing, pricing questions
- tech: Technical problems, bugs, errors, login issues, authentication failures, system crashes, performance issues
- shipping: Delivery problems, package tracking, shipment delays, courier issues, product not received, shipping damage
- other: General inquiries, product questions, feature requests, compliments, or anything not fitting above categories

**Analysis Guidelines:**
- Look for specific keywords and context clues
- Consider the customer's intent and primary concern
- If multiple categories apply, choose the most prominent one
- Rate confidence based on clarity of indicators

**Ticket Content:**
{text}

**Required Response Format:**
Category: [category]
Confidence: [0.0-1.0]
Reasoning: [brief explanation]"""

            model = genai.GenerativeModel(settings.MODEL)
            response = model.generate_content(prompt)
            
            # Parse response with better error handling
            lines = response.text.strip().split('\n')
            category = "other"
            confidence = 0.5
            reasoning = ""
            
            for line in lines:
                line = line.strip()
                if line.startswith("Category:"):
                    category = line.split(":", 1)[1].strip().lower()
                elif line.startswith("Confidence:"):
                    try:
                        conf_str = line.split(":", 1)[1].strip()
                        # Handle various formats like "0.8", "80%", "8/10"
                        if '%' in conf_str:
                            confidence = float(conf_str.replace('%', '')) / 100
                        elif '/' in conf_str:
                            parts = conf_str.split('/')
                            confidence = float(parts[0]) / float(parts[1])
                        else:
                            confidence = float(conf_str)
                    except:
                        confidence = 0.5
                elif line.startswith("Reasoning:"):
                    reasoning = line.split(":", 1)[1].strip()
            
            # Validate and adjust category
            valid_categories = ["billing", "tech", "shipping", "other"]
            if category not in valid_categories:
                # Try to map common variations
                category_mapping = {
                    "technical": "tech", "technology": "tech", "bug": "tech",
                    "payment": "billing", "financial": "billing", "invoice": "billing",
                    "delivery": "shipping", "logistics": "shipping", "transport": "shipping"
                }
                category = category_mapping.get(category, "other")
            
            # Ensure confidence is in valid range
            confidence = max(0.0, min(1.0, confidence))
            
            return {
                "predictedCategory": category,
                "confidence": round(confidence, 2),
                "reasoning": reasoning[:200] if reasoning else None  # Limit reasoning length
            }
            
        except Exception as e:
            # Fallback to keyword classification if Gemini fails
            t = text.lower()
            score = {"billing": 0, "tech": 0, "shipping": 0, "other": 0}
            
            for w in BILLING: 
                score["billing"] += t.count(w)
            for w in TECH: 
                score["tech"] += t.count(w)
            for w in SHIP: 
                score["shipping"] += t.count(w)
            
            cat = max(score, key=score.get)
            conf = min(1.0, (score[cat] / 3.0)) if score[cat] > 0 else 0.3
            
            return {
                "predictedCategory": cat if score[cat] > 0 else "other", 
                "confidence": round(conf, 2)
            }

    def draft(self, text: str, articles: List[Dict]) -> Dict:
        """
        Generate formatted customer support response using best KB match with strict formatting rules.
        Returns: { "draftReply": "...", "citations": ["<articleId>", "<articleId>"] }
        """
        if settings.STUB_MODE:
            # Enhanced stub mode with proper formatting
            if not articles:
                return {
                    "draftReply": """Hello,

Thank you for contacting our support team. We've received your inquiry and are reviewing it carefully.

Our team will respond within 24 hours with detailed assistance tailored to your specific needs.

Please don't hesitate to reply if you have any additional questions in the meantime.

Best regards,
Customer Support Team""", 
                    "citations": []
                }
            
            # Use first article for formatted stub response
            best_article = articles[0]
            article_id = best_article.get('id', '1')
            article_title = best_article.get('title', 'Support Guide')
            
            # Analyze ticket for context
            text_lower = text.lower()
            urgency_words = ["urgent", "critical", "immediately", "asap", "emergency"]
            is_urgent = any(word in text_lower for word in urgency_words)
            
            # Create properly formatted response following strict rules
            response_parts = [
                "Hello,",
                "",
                f"Thank you for contacting our support team{' regarding your urgent request' if is_urgent else ''}.",
                "",
                "Based on our knowledge base, here are the steps to resolve your issue:",
                "",
                "1. **Log into your account** using your credentials",
                "2. **Navigate to the appropriate section** as described in the documentation",
                "3. **Follow the step-by-step instructions** provided in the guide",
                "4. **Verify the changes** have been applied successfully",
                "5. **Contact our support team** if you encounter any difficulties",
                "",
                f"Note: These steps are based on our comprehensive {article_title.lower()} documentation.",
                "",
                f"This information is based on [Article #{article_id}]. Please reply if you need further assistance!",
                "",
                "Best regards,",
                "Customer Support Team"
            ]
            
            return {
                "draftReply": "\n".join(response_parts), 
                "citations": [str(article_id)]
            }
            
        
        # Enhanced Gemini implementation for properly formatted responses
        try:
            if not articles:
                return {
                    "draftReply": """Hello,

Thank you for contacting our support team. We've received your inquiry and will review it thoroughly.

Our team will respond within 24 hours with detailed assistance tailored to your specific needs.

Please don't hesitate to reply if you have any additional questions in the meantime.

Best regards,
Customer Support Team""",
                    "citations": []
                }
            
            # Get the best matching article for the template
            best_article = articles[0]  # Already sorted by relevance from pipeline
            kb_title = best_article.get('title', 'Support Article')
            kb_body = best_article.get('body', best_article.get('content', ''))
            kb_id = str(best_article.get('id', '1'))
            
            # Enhanced prompt with strict formatting requirements
            prompt = f"""You are a professional customer support agent. Create a polished customer support draft response following these EXACT formatting rules:

### STRICT FORMATTING REQUIREMENTS:
1. Start with a friendly greeting ("Hello," or "Hi [Name],")
2. Acknowledge the customer's request in the second paragraph
3. Write instructions as ONE CLEAN NUMBERED LIST (1, 2, 3, etc.)
4. Do NOT repeat the subject/topic before the steps - go directly to the numbered list
5. Include ALL relevant steps from the KB article (do not skip any)
6. Use **bold** for important UI actions, buttons, or key terms
7. Add a "Note:" section at the end with helpful tips from the KB
8. Close with article reference in format [Article #{kb_id}] and encourage replies
9. End with professional signature

### CUSTOMER REQUEST:
{text}

### KNOWLEDGE BASE ARTICLE TO USE:
Title: {kb_title}
Content: {kb_body}
Article ID: {kb_id}

### EXAMPLE FORMAT:
Hello,

Thank you for contacting us about [acknowledge their request].

Here are the steps to resolve this:

1. **Action step one** with specific instructions
2. **Action step two** with clear guidance  
3. **Action step three** as detailed in our guide
4. **Final verification step** to ensure success

Note: [Include any important tips or warnings from the KB article]

This solution is based on [Article #{kb_id}]. Please reply if you need further assistance!

Best regards,
Customer Support Team

### YOUR RESPONSE:"""

            model = genai.GenerativeModel(settings.MODEL)
            response = model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Post-process the response to ensure proper formatting
            response_text = self._ensure_proper_formatting(response_text, kb_id, text)
            
            # Extract citations
            citations = self._extract_citations(response_text, articles)
            
            return {
                "draftReply": response_text,
                "citations": citations
            }
            
        except Exception as e:
            # Enhanced fallback template with proper formatting
            best_article = articles[0] if articles else None
            article_id = str(best_article.get('id', '1')) if best_article else '1'
            article_title = best_article.get('title', 'our knowledge base') if best_article else 'our knowledge base'
            
            fallback_response = f"""Hello,

Thank you for contacting our support team regarding your inquiry.

Based on {article_title}, here are the recommended steps:

1. **Review the relevant documentation** in your account settings
2. **Follow the step-by-step process** as outlined in our guide
3. **Verify each step** is completed successfully before proceeding
4. **Contact our support team** if you encounter any issues during the process

Note: These instructions are based on our standard resolution procedures.

This information is from [Article #{article_id}]. Please reply if you need further assistance!

Best regards,
Customer Support Team"""
            
            return {
                "draftReply": fallback_response,
                "citations": [str(article_id)]
            }
    
    def _ensure_proper_formatting(self, response_text: str, kb_id: str, original_request: str) -> str:
        """Ensure the response follows the strict formatting rules"""
        lines = response_text.split('\n')
        
        # Ensure proper greeting
        if not any(lines[0].strip().startswith(greeting) for greeting in ["Hello", "Hi", "Dear"]):
            lines.insert(0, "Hello,")
            lines.insert(1, "")
        
        # Ensure proper closure with citation
        has_citation = f"[Article #{kb_id}]" in response_text
        has_proper_closing = any("Best regards" in line or "Sincerely" in line for line in lines[-3:])
        
        if not has_citation or not has_proper_closing:
            # Find where to insert the closing
            closing_lines = [
                "",
                f"This information is based on [Article #{kb_id}]. Please reply if you need further assistance!",
                "",
                "Best regards,",
                "Customer Support Team"
            ]
            
            # Remove existing inadequate closing
            while lines and (not lines[-1].strip() or lines[-1].strip() in ["Best regards", "Sincerely", "Thank you"]):
                lines.pop()
            
            lines.extend(closing_lines)
        
        return '\n'.join(lines)
    
    def _extract_citations(self, response_text: str, articles: List[Dict]) -> List[str]:
        """Extract and validate citations from the response"""
        citations = []
        import re
        
        # Look for various citation patterns
        citation_patterns = [
            r'Article #(\w+)',
            r'\[Article #(\w+)\]',
            r'\[#(\w+)\]'
        ]
        
        for pattern in citation_patterns:
            matches = re.findall(pattern, response_text, re.IGNORECASE)
            for match in matches:
                # Verify this article exists in our provided articles
                for article in articles:
                    if str(article.get('id', '')) == str(match):
                        if match not in citations:
                            citations.append(str(match))
        
        # Ensure we have at least one citation if articles were provided
        if not citations and articles:
            citations = [str(articles[0].get('id', '1'))]
        
        return citations

provider = LLMProvider()
