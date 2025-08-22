from fastapi import FastAPI, HTTPException
from schemas import TriageRequest, TriageResponse, StepLog
from pipeline import run_pipeline

app = FastAPI(title="Agent Worker", version="1.0.0")

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/triage", response_model=TriageResponse)
def triage(req: TriageRequest):
    try:
        resp = run_pipeline(req.traceId, req.ticket.dict(), [k.dict() for k in req.kb])
        resp["stepLogs"] = [StepLog(**s).dict() for s in resp["stepLogs"]]
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail="Agent error")
