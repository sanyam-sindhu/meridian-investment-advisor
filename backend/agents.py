import os
import json
import asyncio
from typing import TypedDict, Any

from dotenv import load_dotenv
from anthropic import AsyncAnthropic
from langgraph.graph import StateGraph, END

from schemas import PORTFOLIO_SCHEMA, RISK_SCHEMA, RECO_SCHEMA

load_dotenv()

MODEL = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
client = AsyncAnthropic()


class State(TypedDict, total=False):
    client_id: str
    profile: dict
    assessment: dict
    documents: list
    queue: Any
    portfolio: dict
    risk: dict
    recommendation: dict


async def emit(queue, event):
    if queue is not None:
        await queue.put(event)


async def call_claude(system, user, tool_name, schema):
    resp = await client.messages.create(
        model=MODEL,
        max_tokens=2000,
        system=system,
        messages=[{"role": "user", "content": user}],
        tools=[{
            "name": tool_name,
            "description": f"Return structured {tool_name} output",
            "input_schema": schema,
        }],
        tool_choice={"type": "tool", "name": tool_name},
    )
    for block in resp.content:
        if block.type == "tool_use":
            return block.input
    raise RuntimeError(f"Claude returned no tool_use block for {tool_name}")


async def tick_progress(queue, agent, steps):
    for p in steps:
        await asyncio.sleep(1.0)
        await emit(queue, {"agent": agent, "status": "running", "progress": p})


async def portfolio_node(state: State) -> State:
    queue = state.get("queue")
    docs = state.get("documents", [])
    profile = state.get("profile", {})

    await emit(queue, {"agent": "portfolio", "status": "running", "progress": 5})

    country = profile.get("country", "India")
    doc_text = "\n".join(
        f"--- {d.get('name')} ---\n{d.get('text') or '(no content)'}"
        for d in docs
    ) if docs else "(none)"
    user = (
        f"Country/Market: {country}\n"
        f"Client notes: {profile.get('notes','(none)')}\n"
        f"Client goals: {profile.get('goals','(none)')}\n"
        f"Uploaded documents:\n{doc_text}\n\n"
        f"Analyze the current portfolio composition for a {country} client. Return concrete metrics: "
        "documents analyzed, estimated number of holdings, distinct asset classes, "
        "diversification score (0-100), target allocation breakdown, and 3-4 bullet findings. "
        f"Use {country}-specific context (e.g. market benchmarks, regulations, currency)."
    )

    claude_task = asyncio.create_task(call_claude(
        f"You are a Portfolio Analysis agent at a wealth management firm specializing in {country} markets. "
        "Return grounded, realistic numbers based on the profile notes.",
        user, "portfolio_analysis", PORTFOLIO_SCHEMA,
    ))
    await tick_progress(queue, "portfolio", [25, 50, 75])
    result = await claude_task

    await emit(queue, {"agent": "portfolio", "status": "complete", "progress": 100, "metrics": result})
    return {"portfolio": result}


async def risk_node(state: State) -> State:
    queue = state.get("queue")
    portfolio = state.get("portfolio", {})
    assessment = state.get("assessment", {})

    await emit(queue, {"agent": "risk", "status": "running", "progress": 5})

    user = (
        f"Portfolio snapshot: {json.dumps(portfolio)}\n"
        f"Assessment answers: {json.dumps(assessment)}\n\n"
        "Evaluate risk-adjusted returns, concentration, and liquidity risk. "
        "Return Sharpe, Sortino, counts of metrics/checks/events, overall risk score (0-100), and 3-4 findings."
    )

    claude_task = asyncio.create_task(call_claude(
        "You are a Risk Assessment agent. Focus on concentration risk, liquidity, and risk-adjusted returns.",
        user, "risk_assessment", RISK_SCHEMA,
    ))
    await tick_progress(queue, "risk", [25, 50, 75])
    result = await claude_task

    await emit(queue, {"agent": "risk", "status": "complete", "progress": 100, "metrics": result})
    return {"risk": result}


async def recommendation_node(state: State) -> State:
    queue = state.get("queue")
    profile = state.get("profile", {})
    assessment = state.get("assessment", {})
    portfolio = state.get("portfolio", {})
    risk = state.get("risk", {})

    await emit(queue, {"agent": "recommendation", "status": "running", "progress": 5})

    user = (
        f"Profile: {json.dumps({'notes': profile.get('notes',''), 'goals': profile.get('goals','')})}\n"
        f"Assessment: {json.dumps(assessment)}\n"
        f"Portfolio findings: {json.dumps(portfolio)}\n"
        f"Risk findings: {json.dumps(risk)}\n\n"
        "Synthesize all inputs and produce an actionable recommendation. Include feasibility (0-100), "
        "impact (0-100), projected vs current annual return, 3-year projected portfolio value, "
        "implementation cost, tax implications (negative for cost), target allocation, and 4-6 actions plus 2-4 risks."
    )

    claude_task = asyncio.create_task(call_claude(
        "You are an Investment Recommendation agent. Synthesize portfolio and risk findings into "
        "a concrete plan with feasibility and impact scoring.",
        user, "investment_recommendations", RECO_SCHEMA,
    ))
    await tick_progress(queue, "recommendation", [15, 30, 45, 60, 78, 92])
    result = await claude_task

    await emit(queue, {"agent": "recommendation", "status": "complete", "progress": 100, "metrics": result})
    await emit(queue, {"type": "done"})
    return {"recommendation": result}


def _build_graph():
    g = StateGraph(State)
    g.add_node("portfolio_agent", portfolio_node)
    g.add_node("risk_agent", risk_node)
    g.add_node("recommendation_agent", recommendation_node)
    g.set_entry_point("portfolio_agent")
    g.add_edge("portfolio_agent", "risk_agent")
    g.add_edge("risk_agent", "recommendation_agent")
    g.add_edge("recommendation_agent", END)
    return g.compile()


graph = _build_graph()


async def run_analysis(client_id, profile, assessment, documents, queue):
    state: State = {
        "client_id": client_id,
        "profile": profile,
        "assessment": assessment,
        "documents": documents,
        "queue": queue,
    }
    return await graph.ainvoke(state)
