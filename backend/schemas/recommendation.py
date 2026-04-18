RECO_SCHEMA = {
    "type": "object",
    "properties": {
        "recommendations_count": {"type": "integer"},
        "return_improvement_pct": {"type": "number"},
        "tax_efficiency_gain_pct": {"type": "number"},
        "implementation_cost": {"type": "number"},
        "feasibility_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "impact_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "projected_annual_return": {"type": "number"},
        "current_annual_return": {"type": "number"},
        "projected_3yr_value": {"type": "number"},
        "tax_implications": {"type": "number"},
        "target_allocation": {
            "type": "object",
            "properties": {
                "stocks": {"type": "number"},
                "bonds": {"type": "number"},
                "cash": {"type": "number"},
                "alternatives": {"type": "number"},
            },
        },
        "actions": {"type": "array", "items": {"type": "string"}},
        "risks": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "recommendations_count", "feasibility_score", "impact_score",
        "projected_annual_return", "current_annual_return", "actions", "risks",
    ],
}
