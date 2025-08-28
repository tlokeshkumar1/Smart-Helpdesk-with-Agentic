from typing import List, Dict, Tuple
import math
import re
from collections import Counter
from config import settings

def enhanced_keyword_score(query: str, doc: Dict) -> float:
    """Enhanced scoring with better relevance calculation"""
    title = (doc.get("title", "") or "").lower()
    body = (doc.get("body", "") or "").lower() 
    tags = [tag.lower() for tag in (doc.get("tags") or [])]
    
    # Clean and tokenize query
    query_words = re.findall(r'\b\w+\b', query.lower())
    query_words = [w for w in query_words if len(w) > 2]  # Filter short words
    
    if not query_words:
        return 0.0
    
    score = 0.0
    
    # Title matching (highest weight)
    title_matches = 0
    for word in query_words:
        if word in title:
            title_matches += title.count(word)
            # Bonus for exact phrase matches in title
            if word in query.lower() and word in title:
                score += 10.0
    
    score += title_matches * 5.0
    
    # Body content matching
    body_matches = 0
    for word in query_words:
        if word in body:
            body_matches += body.count(word)
    
    score += body_matches * 1.0
    
    # Tag matching (high weight)
    tag_matches = 0
    for word in query_words:
        for tag in tags:
            if word in tag:
                tag_matches += 1
                score += 3.0  # High weight for tag matches
    
    # Phrase matching bonus
    query_lower = query.lower()
    if query_lower in title:
        score += 15.0  # High bonus for exact phrase in title
    elif query_lower in body:
        score += 5.0   # Medium bonus for exact phrase in body
    
    # Word density bonus (relevant content has higher density of query terms)
    total_words = len(title.split()) + len(body.split())
    if total_words > 0:
        density = (title_matches + body_matches) / total_words
        score += density * 10.0
    
    # Multiple word matching bonus
    unique_matches = len(set(query_words) & set(title.split() + body.split()))
    if len(query_words) > 1:
        coverage = unique_matches / len(query_words)
        score += coverage * 5.0
    
    return score

def semantic_similarity_score(query: str, doc: Dict) -> float:
    """Basic semantic similarity using common words and concepts"""
    title = (doc.get("title", "") or "").lower()
    body = (doc.get("body", "") or "").lower()
    text = f"{title} {body}"
    
    # Extract meaningful terms
    query_terms = set(re.findall(r'\b\w{3,}\b', query.lower()))
    doc_terms = set(re.findall(r'\b\w{3,}\b', text))
    
    if not query_terms or not doc_terms:
        return 0.0
    
    # Calculate Jaccard similarity
    intersection = len(query_terms & doc_terms)
    union = len(query_terms | doc_terms)
    
    if union == 0:
        return 0.0
    
    return intersection / union

def calculate_relevance_score(query: str, doc: Dict) -> float:
    """Combined relevance score using multiple factors"""
    if not settings.ENHANCED_SEARCH_ENABLED:
        # Fall back to simple scoring
        return simple_keyword_score(query, doc)
    
    keyword_score = enhanced_keyword_score(query, doc)
    semantic_score = semantic_similarity_score(query, doc)
    
    # Weighted combination using config settings
    combined_score = (keyword_score * settings.KEYWORD_WEIGHT) + (semantic_score * settings.SEMANTIC_WEIGHT * 20)  # Scale semantic score
    
    # Boost score based on article freshness (if available)
    if 'updatedAt' in doc or 'createdAt' in doc:
        # Recent articles get a small boost
        combined_score += 0.5
    
    # Boost for high-quality articles (if quality indicators exist)
    if doc.get('status') == 'published':
        combined_score += 0.3
    
    return combined_score

def simple_keyword_score(q: str, doc: Dict) -> float:
    """Legacy function for backward compatibility"""
    text = (doc.get("title", "") + " " + doc.get("body", "")).lower()
    score = 0
    
    for w in set(q.lower().split()):
        score += text.count(w)
    
    # boost tag matches
    for w in set(q.lower().split()):
        score += sum(1 for t in (doc.get("tags") or []) if w in t.lower())
    
    return score

def top_k(q: str, kb: List[Dict], k: int = 3) -> List[Tuple[Dict, float]]:
    """Enhanced top-k retrieval with better scoring"""
    if not q.strip() or not kb:
        return []
    
    # Calculate scores using enhanced algorithm
    scored = []
    for doc in kb:
        relevance_score = calculate_relevance_score(q, doc)
        if relevance_score >= settings.RELEVANCE_THRESHOLD:
            scored.append((doc, relevance_score))
    
    # Sort by relevance score (descending)
    scored.sort(key=lambda x: x[1], reverse=True)
    
    # Return top-k results
    return scored[:k]

def get_best_kb_match(query: str, kb: List[Dict]) -> Dict:
    """Get the single best matching KB article"""
    results = top_k(query, kb, k=1)
    if results:
        return results[0][0]  # Return the document, not the score
    return None
