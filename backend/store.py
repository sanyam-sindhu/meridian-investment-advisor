import os
import json
import random

import asyncpg


SAMPLE_NAMES = [
    "Tata Family Office", "Birla Wealth Trust", "Ambani Capital",
    "Adani Partners", "Mahindra Investments", "Bajaj Family Trust",
    "Godrej Holdings", "Infosys Founders Fund", "Wipro Family Office",
    "HCL Promoter Trust", "Murthy Family Capital", "Premji Wealth",
    "Nilekani Holdings", "Piramal Family Trust", "Hinduja Capital",
]

STRATEGY_NAMES = [
    "Nifty50 Rebalancing", "Midcap Growth Tilt", "LTCG Harvesting",
    "IT Sector Diversification", "Dividend Yield Strategy",
    "Volatility Reduction", "ESG India Transition", "Retirement SIP Glide",
    "G-Sec Ladder Build", "Sectoral Rotation",
]

DECISIONS = ["implement", "consider", "reject"]


SCHEMA = """
CREATE TABLE IF NOT EXISTS profiles (
    client_id  TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS assessments (
    client_id  TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS analyses (
    client_id  TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS decisions (
    client_id  TEXT PRIMARY KEY,
    data       JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


class Store:
    def __init__(self):
        self.pool: asyncpg.Pool | None = None

    async def init(self):
        dsn = os.getenv("DATABASE_URL", "postgresql://advisory:advisory@localhost:5432/advisory")
        self.pool = await asyncpg.create_pool(dsn, min_size=1, max_size=10)
        async with self.pool.acquire() as conn:
            await conn.execute(SCHEMA)

    async def close(self):
        if self.pool is not None:
            await self.pool.close()
            self.pool = None

    async def _upsert(self, table, cid, data):
        async with self.pool.acquire() as conn:
            await conn.execute(
                f"""
                INSERT INTO {table} (client_id, data) VALUES ($1, $2::jsonb)
                ON CONFLICT (client_id) DO UPDATE SET data = EXCLUDED.data
                """,
                cid, json.dumps(data),
            )

    async def _get(self, table, cid):
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(f"SELECT data FROM {table} WHERE client_id = $1", cid)
        return json.loads(row["data"]) if row else None

    async def save_profile(self, cid, data):
        await self._upsert("profiles", cid, data)

    async def get_profile(self, cid):
        return await self._get("profiles", cid)

    async def save_assessment(self, cid, data):
        await self._upsert("assessments", cid, data)

    async def get_assessment(self, cid):
        return await self._get("assessments", cid)

    async def save_analysis(self, cid, data):
        await self._upsert("analyses", cid, data)

    async def get_analysis(self, cid):
        return await self._get("analyses", cid)

    async def save_decision(self, cid, data):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO decisions (client_id, data) VALUES ($1, $2::jsonb)
                ON CONFLICT (client_id) DO UPDATE
                    SET data = EXCLUDED.data, updated_at = now()
                """,
                cid, json.dumps(data),
            )

    async def list_decisions(self):
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("SELECT data FROM decisions ORDER BY updated_at DESC")
        return [json.loads(r["data"]) for r in rows]

    async def delete_decision(self, cid):
        async with self.pool.acquire() as conn:
            await conn.execute("DELETE FROM decisions WHERE client_id = $1", cid)

    async def seed_samples(self):
        rng = random.Random(7)
        records = []
        for i, name in enumerate(SAMPLE_NAMES):
            cid = f"seed{i:03d}"
            decision = rng.choice(DECISIONS)
            feas = rng.randint(28, 96)
            impact = rng.randint(28, 96)
            current = round(rng.uniform(4.0, 6.8), 1)
            improvement = round(rng.uniform(0.3, 2.6), 1)
            records.append((cid, {
                "client_id": cid,
                "client_name": name,
                "strategy_name": rng.choice(STRATEGY_NAMES),
                "decision": decision,
                "feasibility": feas,
                "impact": impact,
                "projected_return": round(current + improvement, 1),
                "current_return": current,
                "implementation_cost": rng.randint(2500, 18000),
                "projected_3yr_value": rng.randint(800000, 4500000),
                "tax_implications": -rng.randint(2000, 25000),
                "portfolio": {
                    "diversification_score": rng.randint(35, 88),
                    "holdings_identified": rng.randint(18, 72),
                    "asset_classes": rng.randint(3, 6),
                    "findings": [
                        "Heavy concentration in IT and banking sectors",
                        "Limited exposure to midcap and smallcap segments",
                        "Cash position above model weight",
                    ],
                },
                "risk": {
                    "risk_score": rng.randint(40, 86),
                    "sharpe_ratio": round(rng.uniform(0.55, 1.45), 2),
                    "sortino_ratio": round(rng.uniform(0.7, 1.65), 2),
                    "findings": [
                        "IT sector exposure exceeds Nifty50 weightage",
                        "Downside volatility above Nifty benchmark",
                    ],
                },
                "recommendation": {
                    "actions": [
                        "Rebalance to Nifty50 index allocation",
                        "Add midcap and smallcap equity sleeve",
                        "Implement LTCG harvesting before March 31",
                        "Shift to dividend yield funds for income",
                    ],
                    "risks": [
                        "STT and brokerage costs during transition",
                        "Short-term STCG tax liability from rebalancing",
                    ],
                },
                "profile_notes": "Seeded sample client",
                "profile_goals": "Long-term growth and risk reduction",
            }))

        async with self.pool.acquire() as conn:
            async with conn.transaction():
                for cid, rec in records:
                    await conn.execute(
                        """
                        INSERT INTO decisions (client_id, data) VALUES ($1, $2::jsonb)
                        ON CONFLICT (client_id) DO UPDATE
                            SET data = EXCLUDED.data, updated_at = now()
                        """,
                        cid, json.dumps(rec),
                    )


store = Store()
