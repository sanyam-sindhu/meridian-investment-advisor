# Meridian Advisory

An AI-powered investment advisory application built as a 5-stage workflow for wealth managers. Each client goes through profile capture, a risk questionnaire, a three-agent AI analysis, recommendation scoring, and a portfolio dashboard.

Backend is FastAPI with LangGraph and Claude Haiku 4.5. Frontend is Vite and React. Data is stored in PostgreSQL running via Docker.


## Setup

You'll need Python 3.10+, Node 18+, Docker Desktop, and an Anthropic API key.

Start the database first:

```bash
cd backend
docker compose up -d
```

This starts Postgres on port 5433. Tables are created automatically on first boot.

Then set up the backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate

pip install -r requirements.txt
```

Create a .env file inside the backend folder with:

```
ANTHROPIC_API_KEY=your_key_here
DATABASE_URL=postgresql://meridian:meridian@localhost:5433/meridian
```

Then start the server:

```bash
uvicorn main:app --reload --port 8000
```

And in a separate terminal, start the frontend:

```bash
cd frontend
npm install
npm run dev
```

The app opens at http://localhost:5173.


## Workflow

Stage 1 is client profile capture. You enter the client's name, country, notes, and goals. You can also upload documents in PDF, Excel, CSV, or TXT format. The text is extracted from these files and passed directly to the AI agents later. At least one text field or one document is required to proceed.

Stage 2 is a risk and goals assessment. Eight questions are asked one at a time covering risk tolerance, investment horizon, liquidity needs, and tax considerations. A coverage meter tracks how many have been answered and requires at least 70% before you can move on. Answers are saved locally so going back doesn't wipe your progress.

Stage 3 is the AI analysis. Three Claude agents run one after another through a LangGraph pipeline. The portfolio agent reads the profile and uploaded documents and returns asset allocation and diversification metrics. The risk agent takes that output plus the assessment answers and returns risk ratios and a risk score. The recommendation agent pulls everything together into an actionable plan with feasibility and impact scores, projected returns, implementation cost, and tax implications. Progress streams live to the browser as each agent runs. Overall progress is weighted as 25% portfolio, 25% risk, and 50% recommendation.

Stage 4 is recommendation scoring. You see color-coded feasibility and impact scores, financial projections in local currency, and findings from all three agents. You pick a strategy name and set your decision as implement, consider, or reject.

Stage 5 is the portfolio dashboard. It shows a sortable table of all client recommendations with expandable rows. There is also a scatter matrix plotting each client by feasibility versus impact, color-coded by decision type, with quadrant labels and hover tooltips. You can export a PDF report for any individual client or the full portfolio.


## Architecture

The backend has five main files. main.py handles all the API routes and SSE streaming. agents.py defines the LangGraph graph with the three agent nodes. store.py is the Postgres data layer using asyncpg with JSONB tables. parser.py handles text extraction from uploaded files. The schemas folder holds the JSON tool schemas that tell Claude exactly what structure to return.

The frontend is organized by stage. Each stage is its own component under src/stages. Shared components like the stepper and scatter matrix live in src/components. All API calls go through api.js and PDF export is handled in exportPdf.js.

Claude's tool use API is used to force each agent to return typed JSON matching a predefined schema rather than free text that needs parsing. LangGraph compiles the three nodes into a directed graph which makes the sequential flow explicit. SSE lets the frontend show live progress without polling the backend repeatedly.

Challenges faced: streaming agent progress while Claude was still running required the Claude call to run as a background task with a shared queue that the SSE endpoint drains in parallel, otherwise all events would arrive at once after the agent finished. The other main challenge was assessment state being lost on back navigation, which was fixed by saving answers and the current question index to localStorage keyed by client ID and clearing them after a successful submission.


## What I would improve with more time

Adding auth so each advisor only sees their own clients would be the first thing. LangGraph supports checkpointing which would let users resume an interrupted analysis rather than starting over. Low, base, and high scenario projections from the recommendation agent would make the output more useful. Unit tests on the agent nodes would also be straightforward since the agents can be run with stub responses. Excel or CSV export alongside the existing PDF would round out the export options.
