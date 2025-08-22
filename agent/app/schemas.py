from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class KBItem(BaseModel):
    id: str
    title: str
    body: str
    tags: List[str] = []

class TicketIn(BaseModel):
    id: str
    title: str
    description: str

class TriageRequest(BaseModel):
    traceId: str
    ticket: TicketIn
    kb: List[KBItem]

class StepLog(BaseModel):
    action: str
    meta: Dict[str, Any] = {}

class ConfidenceFactors(BaseModel):
    classification: float
    retrieval: float
    draft: float
    coverage: float

class QualityMetrics(BaseModel):
    retrievalQuality: float
    draftQuality: float
    citationCount: int
    responseLength: int
    kbCoverage: float

class TriageResponse(BaseModel):
    predictedCategory: str
    draftReply: str
    citations: List[str]
    confidence: float
    originalConfidence: Optional[float] = None
    confidenceFactors: Optional[ConfidenceFactors] = None
    modelInfo: Dict[str, Any]
    stepLogs: List[StepLog] = []
    quality: Optional[QualityMetrics] = None
