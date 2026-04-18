import os
import uuid
import asyncio
import json
from contextlib import asynccontextmanager
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from store import store
from agents import run_analysis
from parser import extract_text


load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await store.init()
    if not await store.list_decisions():
        await store.seed_samples()
    yield
    await store.close()


app = FastAPI(title="Meridian Advisory", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class AssessmentPayload(BaseModel):
    answers: dict
    coverage: float


class ImplementPayload(BaseModel):
    strategy_name: str
    decision: str


@app.get("/api/health")
async def health():
    return {"ok": True, "claude_configured": bool(os.getenv("ANTHROPIC_API_KEY"))}


@app.post("/api/clients")
async def create_client(
    name: str = Form(...),
    country: str = Form("India"),
    notes: str = Form(""),
    goals: str = Form(""),
    files: List[UploadFile] = File(default=[]),
):
    has_text = bool(notes.strip() or goals.strip())
    has_file = len(files) > 0 and any(f.filename for f in files)
    if not has_text and not has_file:
        raise HTTPException(400, "Provide at least one text field or one uploaded document")

    docs = []
    for f in files:
        if not f.filename:
            continue
        content = await f.read()
        docs.append({
            "name": f.filename,
            "size": len(content),
            "type": f.content_type or "application/octet-stream",
            "text": extract_text(f.filename, content),
        })

    cid = uuid.uuid4().hex[:8]
    await store.save_profile(cid, {
        "id": cid,
        "name": name or "Unnamed Client",
        "country": country,
        "notes": notes,
        "goals": goals,
        "documents": docs,
    })
    return {"client_id": cid, "documents": docs}


@app.get("/api/clients/{client_id}")
async def get_client(client_id: str):
    profile = await store.get_profile(client_id)
    if not profile:
        raise HTTPException(404, "Client not found")
    return profile


@app.post("/api/clients/{client_id}/assessment")
async def save_assessment(client_id: str, payload: AssessmentPayload):
    if not await store.get_profile(client_id):
        raise HTTPException(404, "Client not found")
    if payload.coverage < 0.7:
        raise HTTPException(400, "Assessment below 70% coverage threshold")
    await store.save_assessment(client_id, payload.model_dump())
    return {"ok": True}


@app.get("/api/clients/{client_id}/analyze")
async def analyze_stream(client_id: str):
    profile = await store.get_profile(client_id)
    if not profile:
        raise HTTPException(404, "Client not found")
    assessment = await store.get_assessment(client_id) or {}

    queue: asyncio.Queue = asyncio.Queue()

    async def runner():
        try:
            result = await run_analysis(
                client_id,
                profile,
                assessment.get("answers", {}),
                profile.get("documents", []),
                queue,
            )
            await store.save_analysis(client_id, {
                "portfolio": result.get("portfolio", {}),
                "risk": result.get("risk", {}),
                "recommendation": result.get("recommendation", {}),
            })
            print(f"[analysis] saved for {client_id}")
        except Exception as e:
            print(f"[analysis] ERROR for {client_id}: {e}")
            await queue.put({"type": "error", "message": str(e)})

    task = asyncio.create_task(runner())

    async def event_source():
        try:
            while True:
                event = await queue.get()
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("type") in ("done", "error"):
                    break
        finally:
            if not task.done():
                await task

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/clients/{client_id}/analysis")
async def get_analysis(client_id: str):
    a = await store.get_analysis(client_id)
    if not a:
        raise HTTPException(404, "Analysis not found")
    return a


@app.post("/api/clients/{client_id}/implement")
async def implement(client_id: str, payload: ImplementPayload):
    profile = await store.get_profile(client_id)
    analysis = await store.get_analysis(client_id)
    if not profile or not analysis:
        raise HTTPException(404, "Client or analysis not found")
    if payload.decision not in ("implement", "consider", "reject"):
        raise HTTPException(400, "Invalid decision")

    rec = analysis.get("recommendation", {})
    record = {
        "client_id": client_id,
        "client_name": profile["name"],
        "strategy_name": payload.strategy_name or "Unnamed Strategy",
        "decision": payload.decision,
        "feasibility": rec.get("feasibility_score", 0),
        "impact": rec.get("impact_score", 0),
        "projected_return": rec.get("projected_annual_return", 0),
        "current_return": rec.get("current_annual_return", 0),
        "implementation_cost": rec.get("implementation_cost", 0),
        "projected_3yr_value": rec.get("projected_3yr_value", 0),
        "tax_implications": rec.get("tax_implications", 0),
        "portfolio": analysis.get("portfolio", {}),
        "risk": analysis.get("risk", {}),
        "recommendation": rec,
        "profile_notes": profile.get("notes", ""),
        "profile_goals": profile.get("goals", ""),
        "country": profile.get("country", "India"),
    }
    await store.save_decision(client_id, record)
    return record


@app.get("/api/portfolio")
async def list_portfolio():
    return await store.list_decisions()


@app.delete("/api/portfolio/{client_id}")
async def delete_decision(client_id: str):
    await store.delete_decision(client_id)
    return {"ok": True}


@app.post("/api/seed")
async def seed():
    await store.seed_samples()
    return {"ok": True, "count": len(await store.list_decisions())}
