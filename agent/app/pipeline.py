from typing import Dict, Any, List
from llm_provider import provider
from search import top_k
from config import settings
import uuid
import time

class TriagePlanner:
    """
    Simple state machine planner for ticket triage workflow
    """
    def __init__(self):
        self.workflow_steps = [
            "classification",
            "retrieval", 
            "drafting",
            "decision"
        ]
    
    def plan(self, ticket: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Build execution plan based on ticket characteristics"""
        text = f"{ticket.get('title', '')} {ticket.get('description', '')}"
        text_length = len(text)
        
        plan = []
        
        # Step 1: Classification
        plan.append({
            "step": "classification",
            "action": "classify_ticket", 
            "priority": "high",
            "estimated_duration_ms": 500 if settings.STUB_MODE else 2000,
            "requirements": ["text_analysis"]
        })
        
        # Step 2: Knowledge Retrieval
        retrieval_config = {
            "step": "retrieval",
            "action": "search_knowledge_base",
            "priority": "high", 
            "estimated_duration_ms": 200,
            "requirements": ["classification_complete"],
            "max_articles": settings.MAX_ARTICLES
        }
        
        # Adjust retrieval strategy based on text length
        if text_length > 500:
            retrieval_config["search_strategy"] = "comprehensive"
            retrieval_config["max_articles"] = min(5, settings.MAX_ARTICLES + 2)
        else:
            retrieval_config["search_strategy"] = "focused"
            
        plan.append(retrieval_config)
        
        # Step 3: Response Drafting
        plan.append({
            "step": "drafting",
            "action": "generate_response",
            "priority": "medium",
            "estimated_duration_ms": 1000 if settings.STUB_MODE else 3000,
            "requirements": ["classification_complete", "retrieval_complete"],
            "response_style": "professional_helpful"
        })
        
        # Step 4: Decision Making
        plan.append({
            "step": "decision", 
            "action": "compute_confidence_score",
            "priority": "critical",
            "estimated_duration_ms": 100,
            "requirements": ["classification_complete", "retrieval_complete", "drafting_complete"],
            "decision_factors": ["classification_confidence", "retrieval_quality", "response_completeness"]
        })
        
        return plan

def plan():
    """Legacy function for backward compatibility"""
    return ["classify", "retrieve", "draft", "decide"]

def run_pipeline(trace_id: str, ticket: Dict[str, Any], kb: list) -> Dict[str, Any]:
    """
    Enhanced agentic pipeline with planning, confidence scoring, and decision logic
    """
    planner = TriagePlanner()
    execution_plan = planner.plan(ticket)
    steps = []
    text = f"{ticket.get('title', '')} {ticket.get('description', '')}"
    pipeline_start_time = time.time()
    
    # Log pipeline initialization with plan
    steps.append({
        "action": "PIPELINE_STARTED", 
        "meta": {
            "traceId": trace_id,
            "ticketId": ticket.get('id'),
            "textLength": len(text),
            "kbArticlesCount": len(kb),
            "plannedSteps": len(execution_plan),
            "executionPlan": [step["step"] for step in execution_plan],
            "estimatedTotalDurationMs": sum(step["estimated_duration_ms"] for step in execution_plan)
        }
    })

    # STEP 1: CLASSIFICATION
    step_start = time.time()
    classification_result = provider.classify(text)
    classification_duration = time.time() - step_start
    
    steps.append({
        "action": "AGENT_CLASSIFIED", 
        "meta": {
            **classification_result,
            "processingTimeMs": round(classification_duration * 1000, 2),
            "textAnalyzed": text[:100] + "..." if len(text) > 100 else text,
            "planStep": "classification",
            "stepCompleted": True
        }
    })

    # STEP 2: KNOWLEDGE RETRIEVAL
    step_start = time.time()
    search_strategy = next((step for step in execution_plan if step["step"] == "retrieval"), {})
    max_articles = search_strategy.get("max_articles", settings.MAX_ARTICLES)
    
    search_results = top_k(text, kb, k=max_articles)
    selected_articles = [doc for doc, score in search_results]
    retrieval_scores = [score for doc, score in search_results]
    citations = [doc["id"] for doc in selected_articles]
    retrieval_duration = time.time() - step_start
    
    # Calculate retrieval quality metrics
    avg_score = sum(retrieval_scores) / len(retrieval_scores) if retrieval_scores else 0
    max_score = max(retrieval_scores) if retrieval_scores else 0
    score_variance = sum((s - avg_score) ** 2 for s in retrieval_scores) / len(retrieval_scores) if len(retrieval_scores) > 1 else 0
    
    steps.append({
        "action": "KB_RETRIEVED", 
        "meta": {
            "articleIds": citations,
            "searchQuery": text[:100] + "..." if len(text) > 100 else text,
            "retrievalScores": retrieval_scores,
            "maxScore": max_score,
            "avgScore": round(avg_score, 3),
            "scoreVariance": round(score_variance, 3),
            "searchStrategy": search_strategy.get("search_strategy", "standard"),
            "processingTimeMs": round(retrieval_duration * 1000, 2),
            "planStep": "retrieval",
            "stepCompleted": True
        }
    })

    # STEP 3: RESPONSE DRAFTING
    step_start = time.time()
    draft_result = provider.draft(text, selected_articles)
    drafting_duration = time.time() - step_start
    
    # Validate draft quality
    draft_quality_score = 0.5  # Base score
    if draft_result['draftReply']:
        word_count = len(draft_result['draftReply'].split())
        if word_count >= 20:  # Reasonable length
            draft_quality_score += 0.2
        if word_count <= 200:  # Not too verbose
            draft_quality_score += 0.1
        if len(draft_result.get('citations', [])) > 0:  # Has citations
            draft_quality_score += 0.2
    
    draft_quality_score = min(1.0, draft_quality_score)
    
    steps.append({
        "action": "DRAFT_GENERATED", 
        "meta": {
            "draftLength": len(draft_result['draftReply']),
            "citationsCount": len(draft_result.get('citations', [])),
            "citationIds": draft_result.get('citations', []),
            "processingTimeMs": round(drafting_duration * 1000, 2),
            "wordCount": len(draft_result['draftReply'].split()) if draft_result['draftReply'] else 0,
            "qualityScore": round(draft_quality_score, 2),
            "planStep": "drafting",
            "stepCompleted": True
        }
    })

    # STEP 4: DECISION & CONFIDENCE SCORING
    step_start = time.time()
    
    # Enhanced confidence calculation with multiple factors
    base_confidence = classification_result["confidence"]
    
    # Calculate individual quality factors
    # Factor 1: Retrieval quality assessment
    retrieval_quality = 0.5  # Default moderate quality
    if retrieval_scores:
        max_retrieval_score = max(retrieval_scores)
        avg_retrieval_score = sum(retrieval_scores) / len(retrieval_scores)
        # Good if max score is high AND average is decent
        retrieval_quality = min(1.0, (max_retrieval_score * 0.7 + avg_retrieval_score * 0.3))
    
    # Factor 2: Draft quality assessment (already calculated)
    # draft_quality_score is between 0.5-1.0
    
    # Factor 3: KB coverage assessment  
    kb_coverage_quality = 0.5  # Default
    if len(kb) > 0:
        coverage_ratio = len(selected_articles) / len(kb)
        # Good coverage if we found relevant articles
        kb_coverage_quality = min(1.0, coverage_ratio * 2)  # Scale up for better scoring
    
    # Smart confidence adjustment instead of replacement
    confidence_boost = 0.0
    confidence_penalty = 0.0
    
    # Boost confidence for high-quality retrieval matches
    if retrieval_quality > 0.8:
        confidence_boost += 0.1  # Strong KB match
    elif retrieval_quality > 0.6:
        confidence_boost += 0.05  # Good KB match
        
    # Boost confidence for good draft quality
    if draft_quality_score > 0.8:
        confidence_boost += 0.05
        
    # Boost confidence for good KB coverage
    if kb_coverage_quality > 0.8:
        confidence_boost += 0.05
    
    # Apply penalties for problematic cases
    if len(text.split()) < 5:  # Very short tickets
        confidence_penalty += 0.1
    if not selected_articles:  # No KB articles found
        confidence_penalty += 0.2
    if classification_result["predictedCategory"] == "other":  # Unclear category
        confidence_penalty += 0.1
    
    # Final confidence: start with base, apply adjustments
    final_confidence = base_confidence + confidence_boost - confidence_penalty
    final_confidence = max(0.0, min(1.0, final_confidence))  # Clamp to [0,1]
    
    # For detailed factor reporting (for debugging)
    confidence_factors = {
        "classification": base_confidence,
        "retrieval": retrieval_quality,
        "draft": draft_quality_score,
        "coverage": kb_coverage_quality,
        "boost_applied": confidence_boost,
        "penalty_applied": confidence_penalty
    }
        
    decision_duration = time.time() - step_start
    total_processing_time = time.time() - pipeline_start_time
    
    steps.append({
        "action": "DECISION_COMPUTED",
        "meta": {
            "originalConfidence": base_confidence,
            "finalConfidence": round(final_confidence, 3),
            "confidenceFactors": {
                "classification": round(base_confidence, 3),
                "retrieval": round(retrieval_quality, 3), 
                "draft": round(draft_quality_score, 3),
                "coverage": round(kb_coverage_quality, 3),
                "boost": round(confidence_boost, 3),
                "penalty": round(confidence_penalty, 3)
            },
            "retrievalQuality": round(max_score, 3),
            "draftQuality": round(draft_quality_score, 3),
            "totalProcessingTimeMs": round(total_processing_time * 1000, 2),
            "decisionProcessingTimeMs": round(decision_duration * 1000, 2),
            "planStep": "decision",
            "stepCompleted": True
        }
    })

    # Prepare final response with comprehensive metadata
    response = {
        "predictedCategory": classification_result["predictedCategory"],
        "draftReply": draft_result["draftReply"],
        "citations": draft_result["citations"],
        "confidence": round(final_confidence, 3),
        "originalConfidence": base_confidence,
        "confidenceFactors": confidence_factors,
        "modelInfo": {
            "provider": "stub" if settings.STUB_MODE else "gemini",
            "model": "deterministic-heuristic" if settings.STUB_MODE else settings.MODEL,
            "promptVersion": settings.PROMPT_VERSION,
            "stubMode": settings.STUB_MODE,
            "totalProcessingTimeMs": round(total_processing_time * 1000, 2),
            "executionPlan": execution_plan
        },
        "stepLogs": steps,
        "quality": {
            "retrievalQuality": round(max_score, 3),
            "draftQuality": round(draft_quality_score, 3),
            "citationCount": len(draft_result.get('citations', [])),
            "responseLength": len(draft_result['draftReply']) if draft_result['draftReply'] else 0,
            "kbCoverage": round(len(selected_articles) / max(1, len(kb)), 3)
        }
    }
    
    # Final completion log
    steps.append({
        "action": "PIPELINE_COMPLETED",
        "meta": {
            "finalConfidence": response["confidence"],
            "totalSteps": len(steps),
            "success": True,
            "executionTimeMs": round(total_processing_time * 1000, 2),
            "allStepsCompleted": True
        }
    })
    
    return response
