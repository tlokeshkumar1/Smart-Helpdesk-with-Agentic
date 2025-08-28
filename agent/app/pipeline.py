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

    # STEP 2: ENHANCED KNOWLEDGE RETRIEVAL
    step_start = time.time()
    search_strategy = next((step for step in execution_plan if step["step"] == "retrieval"), {})
    max_articles = search_strategy.get("max_articles", settings.MAX_ARTICLES)
    
    # Use enhanced search with better scoring
    search_results = top_k(text, kb, k=max_articles)
    selected_articles = [doc for doc, score in search_results]
    retrieval_scores = [score for doc, score in search_results]
    citations = [doc["id"] for doc in selected_articles]
    retrieval_duration = time.time() - step_start
    
    # Enhanced retrieval quality metrics
    avg_score = sum(retrieval_scores) / len(retrieval_scores) if retrieval_scores else 0
    max_score = max(retrieval_scores) if retrieval_scores else 0
    min_score = min(retrieval_scores) if retrieval_scores else 0
    score_variance = sum((s - avg_score) ** 2 for s in retrieval_scores) / len(retrieval_scores) if len(retrieval_scores) > 1 else 0
    
    # Calculate quality indicators
    quality_threshold = 5.0  # Articles with score >= 5 are considered good matches
    high_quality_matches = sum(1 for score in retrieval_scores if score >= quality_threshold)
    match_consistency = 1 - (score_variance / (avg_score + 1))  # Normalized consistency metric
    
    steps.append({
        "action": "KB_RETRIEVED", 
        "meta": {
            "articleIds": citations,
            "searchQuery": text[:100] + "..." if len(text) > 100 else text,
            "retrievalScores": retrieval_scores,
            "maxScore": round(max_score, 3),
            "minScore": round(min_score, 3),
            "avgScore": round(avg_score, 3),
            "scoreVariance": round(score_variance, 3),
            "highQualityMatches": high_quality_matches,
            "matchConsistency": round(match_consistency, 3),
            "searchStrategy": search_strategy.get("search_strategy", "enhanced"),
            "processingTimeMs": round(retrieval_duration * 1000, 2),
            "planStep": "retrieval",
            "stepCompleted": True
        }
    })

    # STEP 3: ENHANCED RESPONSE DRAFTING
    step_start = time.time()
    draft_result = provider.draft(text, selected_articles)
    drafting_duration = time.time() - step_start
    
    # Enhanced draft quality assessment
    draft_quality_score = 0.3  # Base score
    draft_text = draft_result.get('draftReply', '')
    
    if draft_text:
        # Content quality checks
        word_count = len(draft_text.split())
        line_count = len(draft_text.split('\n'))
        
        # Length appropriateness (50-400 words is good range)
        if 50 <= word_count <= 400:
            draft_quality_score += 0.2
        elif word_count >= 20:  # Minimum acceptable
            draft_quality_score += 0.1
        
        # Structure quality checks
        has_greeting = any(greeting in draft_text for greeting in ["Hello", "Hi", "Dear"])
        has_numbered_list = any(f"{i}." in draft_text for i in range(1, 10))
        has_bold_formatting = "**" in draft_text
        has_note_section = "Note:" in draft_text
        has_closing = any(closing in draft_text for closing in ["Best regards", "Sincerely"])
        has_citation = "[Article #" in draft_text
        
        # Quality scoring based on formatting requirements
        formatting_score = sum([
            has_greeting * 0.05,      # Proper greeting
            has_numbered_list * 0.1,  # Numbered steps
            has_bold_formatting * 0.05, # Bold text for emphasis
            has_note_section * 0.05,  # Note section
            has_closing * 0.05,       # Professional closing
            has_citation * 0.1        # KB citation
        ])
        
        draft_quality_score += formatting_score
        
        # Citation quality
        citations_count = len(draft_result.get('citations', []))
        if citations_count > 0:
            draft_quality_score += 0.1
        if citations_count >= 1:  # Ideal range
            draft_quality_score += 0.05
    
    draft_quality_score = min(1.0, draft_quality_score)
    
    steps.append({
        "action": "DRAFT_GENERATED", 
        "meta": {
            "draftLength": len(draft_text),
            "citationsCount": len(draft_result.get('citations', [])),
            "citationIds": draft_result.get('citations', []),
            "processingTimeMs": round(drafting_duration * 1000, 2),
            "wordCount": len(draft_text.split()) if draft_text else 0,
            "lineCount": len(draft_text.split('\n')) if draft_text else 0,
            "qualityScore": round(draft_quality_score, 3),
            "formattingChecks": {
                "hasGreeting": any(greeting in draft_text for greeting in ["Hello", "Hi", "Dear"]),
                "hasNumberedList": any(f"{i}." in draft_text for i in range(1, 10)),
                "hasBoldFormatting": "**" in draft_text,
                "hasNoteSection": "Note:" in draft_text,
                "hasClosing": any(closing in draft_text for closing in ["Best regards", "Sincerely"]),
                "hasCitation": "[Article #" in draft_text
            },
            "planStep": "drafting",
            "stepCompleted": True
        }
    })

    # STEP 4: ENHANCED DECISION & CONFIDENCE SCORING
    step_start = time.time()
    
    # Enhanced confidence calculation with multiple factors
    base_confidence = classification_result["confidence"]
    
    # Factor 1: Enhanced retrieval quality assessment
    retrieval_quality = 0.3  # Default lower baseline
    if retrieval_scores:
        max_retrieval_score = max(retrieval_scores)
        avg_retrieval_score = sum(retrieval_scores) / len(retrieval_scores)
        
        # Quality thresholds for enhanced scoring
        excellent_threshold = 15.0  # Very high relevance
        good_threshold = 5.0        # Good relevance
        acceptable_threshold = 1.0  # Minimum relevance
        
        # Score based on best match quality
        if max_retrieval_score >= excellent_threshold:
            retrieval_quality = 0.9 + min(0.1, (max_retrieval_score - excellent_threshold) / 20.0)
        elif max_retrieval_score >= good_threshold:
            retrieval_quality = 0.6 + (max_retrieval_score - good_threshold) / (excellent_threshold - good_threshold) * 0.3
        elif max_retrieval_score >= acceptable_threshold:
            retrieval_quality = 0.3 + (max_retrieval_score - acceptable_threshold) / (good_threshold - acceptable_threshold) * 0.3
        
        # Boost for consistency (multiple good matches)
        high_quality_count = sum(1 for score in retrieval_scores if score >= good_threshold)
        if high_quality_count > 1:
            retrieval_quality = min(1.0, retrieval_quality + 0.05 * (high_quality_count - 1))
    
    # Factor 2: Enhanced draft quality assessment (already calculated)
    # draft_quality_score includes formatting checks
    
    # Factor 3: Enhanced KB coverage assessment  
    kb_coverage_quality = 0.3  # Default lower baseline
    if len(kb) > 0:
        # Coverage based on finding relevant matches
        relevant_matches = sum(1 for score in retrieval_scores if score >= 1.0)
        coverage_ratio = relevant_matches / len(kb)
        
        # Good coverage if we found multiple relevant articles
        kb_coverage_quality = min(1.0, 0.3 + coverage_ratio * 0.7)
        
        # Bonus for having at least one excellent match
        if max_score >= 10.0:
            kb_coverage_quality = min(1.0, kb_coverage_quality + 0.1)
    
    # Smart confidence adjustment with enhanced logic
    confidence_boost = 0.0
    confidence_penalty = 0.0
    
    # Enhanced boost conditions
    if retrieval_quality > 0.85:  # Excellent KB match
        confidence_boost += 0.15
    elif retrieval_quality > 0.7:  # Very good KB match
        confidence_boost += 0.1
    elif retrieval_quality > 0.5:  # Good KB match
        confidence_boost += 0.05
        
    # Enhanced boost for excellent draft quality
    if draft_quality_score > 0.9:
        confidence_boost += 0.1
    elif draft_quality_score > 0.7:
        confidence_boost += 0.05
        
    # Boost for excellent KB coverage
    if kb_coverage_quality > 0.8:
        confidence_boost += 0.05
    
    # Enhanced penalty conditions
    if len(text.split()) < 3:  # Very short tickets
        confidence_penalty += 0.15
    elif len(text.split()) < 8:  # Short tickets
        confidence_penalty += 0.05
        
    if not selected_articles:  # No KB articles found
        confidence_penalty += 0.25
    elif max_score < 1.0:  # Poor KB matches
        confidence_penalty += 0.1
        
    if classification_result["predictedCategory"] == "other":  # Unclear category
        confidence_penalty += 0.1
    
    # Special boost for well-formatted responses with good KB matches
    if draft_quality_score > 0.8 and retrieval_quality > 0.7:
        confidence_boost += 0.05  # Synergy bonus
    
    # Final confidence: start with base, apply adjustments
    final_confidence = base_confidence + confidence_boost - confidence_penalty
    final_confidence = max(0.1, min(1.0, final_confidence))  # Clamp to [0.1,1]
    
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
