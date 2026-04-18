PORTFOLIO_SCHEMA = {
    "type": "object",
    "properties": {
        "documents_analyzed": {"type": "integer"},
        "holdings_identified": {"type": "integer"},
        "asset_classes": {"type": "integer"},
        "diversification_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "allocation": {
            "type": "object",
            "properties": {
                "stocks": {"type": "number"},
                "bonds": {"type": "number"},
                "cash": {"type": "number"},
                "alternatives": {"type": "number"},
            },
        },
        "findings": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "documents_analyzed", "holdings_identified", "asset_classes",
        "diversification_score", "findings",
    ],
}
