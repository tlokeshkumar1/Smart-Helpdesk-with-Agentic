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
        Generate response draft with citations.
        Returns: { "draftReply": "...", "citations": ["<articleId>", "<articleId>"] }
        """
        if settings.STUB_MODE:
            # Enhanced deterministic drafting for stub mode
            if not articles:
                return {
                    "draftReply": "Thank you for contacting our support team. We've received your request and will review it shortly. Our team will respond within 24 hours with detailed assistance.",
                    "citations": []
                }
            
            # Extract information from articles
            article_titles = [article["title"] for article in articles]
            article_ids = [article["id"] for article in articles]
            
            # Build response based on ticket content and available articles
            response_parts = ["Thank you for reaching out to our support team."]
            
            # Analyze ticket content for better templated responses
            text_lower = text.lower()
            
            if any(word in text_lower for word in ["urgent", "critical", "immediately", "asap"]):
                response_parts.append("I understand this is urgent and I'm here to help.")
            
            # Add article references
            if len(articles) == 1:
                response_parts.append(f"\nI found a relevant resource that should help with your inquiry:")
                response_parts.append(f"1. {article_titles[0]} [Article #{article_ids[0]}]")
            else:
                response_parts.append(f"\nI found {len(articles)} relevant resources that may help:")
                for i, (title, article_id) in enumerate(zip(article_titles, article_ids), 1):
                    response_parts.append(f"{i}. {title} [Article #{article_id}]")
            
            # Add contextual guidance based on article content
            for article in articles:
                body = article.get('body', article.get('content', ''))
                if body:
                    # Extract first sentence or short summary
                    sentences = body.split('. ')
                    if sentences:
                        summary = sentences[0][:100] + ("..." if len(sentences[0]) > 100 else "")
                        response_parts.append(f"   → {summary}")
                    break  # Only add summary for first article to keep response concise
            
            # Add appropriate closing based on content analysis
            if any(word in text_lower for word in ["how", "what", "when", "where", "why"]):
                response_parts.append("\nThese resources should answer your question comprehensively.")
            else:
                response_parts.append("\nPlease review these resources which should help resolve your issue.")
            
            response_parts.append("If these resources fully address your concern, you may consider this ticket resolved.")
            response_parts.append("If you need further assistance, our support team will follow up with you.")
            response_parts.append("\nBest regards,\nSupport Bot")
            
            return {
                "draftReply": "\n".join(response_parts), 
                "citations": article_ids
            }
        
        # Enhanced Gemini implementation for better responses
        try:
            if not articles:
                return {
                    "draftReply": "Thank you for contacting our support team. We've received your inquiry and will review it thoroughly. Our team will respond within 24 hours with detailed assistance.",
                    "citations": []
                }
            
            # Prepare enhanced context from KB articles
            kb_context_parts = []
            for a in articles:
                article_text = f"**Article #{a['id']}: {a['title']}**\n{a.get('body', a.get('content', ''))}"
                if 'tags' in a and a['tags']:
                    article_text += f"\nTags: {', '.join(a['tags'])}"
                kb_context_parts.append(article_text)
            
            kb_context = "\n\n".join(kb_context_parts)
            
            prompt = f"""You are a professional customer support agent. Draft a helpful, empathetic response to the customer's inquiry using the provided knowledge base articles.

**Customer Inquiry:**
{text}

**Available Knowledge Base Articles:**
{kb_context}

**Response Guidelines:**
1. Be professional, empathetic, and helpful
2. Address the customer's specific concern directly
3. Reference relevant articles using format [Article #ID]
4. Provide actionable steps when possible
5. If articles fully resolve the issue, suggest ticket closure
6. If not fully resolved, mention follow-up by support team
7. Keep response concise but comprehensive (max 300 words)
8. Use a warm, professional tone

**Draft Response:**"""

            model = genai.GenerativeModel(settings.MODEL)
            response = model.generate_content(prompt)
            
            # Extract citations with improved pattern matching
            citations = []
            response_text = response.text.strip()
            
            # Look for various citation patterns
            import re
            citation_patterns = [
                r'Article #(\d+)',
                r'\[Article #(\d+)\]',
                r'\[#(\d+)\]',
                r'#(\d+)',
                r'article (\d+)',
                r'Article (\d+)'
            ]
            
            for pattern in citation_patterns:
                matches = re.findall(pattern, response_text, re.IGNORECASE)
                for match in matches:
                    article_id = match
                    # Verify this article exists in our provided articles
                    for article in articles:
                        if str(article['id']) == str(article_id):
                            if article_id not in citations:
                                citations.append(article_id)
            
            # Ensure we have citations for quality control
            if not citations and articles:
                # If no citations found but articles were provided, add them
                citations = [str(a['id']) for a in articles[:2]]  # Add first 2 articles
                
                # Append citation to response if missing
                if len(articles) == 1:
                    response_text += f"\n\nRelevant resource: [Article #{articles[0]['id']}]"
                else:
                    response_text += f"\n\nRelevant resources: " + ", ".join([f"[Article #{a['id']}]" for a in articles[:2]])
            
            return {
                "draftReply": response_text,
                "citations": citations
            }
            
        except Exception as e:
            # Fallback to template if Gemini fails
            return {
                "draftReply": f"Thank you for contacting support. We're reviewing your request and will respond shortly. Reference: {text[:50]}...",
                "citations": [a["id"] for a in articles]
            }

provider = LLMProvider()
