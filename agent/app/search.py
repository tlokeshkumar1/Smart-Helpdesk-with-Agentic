from typing import List, Dict, Tuple
import math

def simple_keyword_score(q: str, doc: Dict) -> float:
    text = (doc.get("title", "") + " " + doc.get("body", "")).lower()
    score = 0
    
    for w in set(q.lower().split()):
        score += text.count(w)
    
    # boost tag matches
    for w in set(q.lower().split()):
        score += sum(1 for t in (doc.get("tags") or []) if w in t.lower())
    
    return score

def top_k(q: str, kb: List[Dict], k: int = 3) -> List[Tuple[Dict, float]]:
    scored = [(doc, simple_keyword_score(q, doc)) for doc in kb]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [(d, s) for d, s in scored[:k] if s > 0]
