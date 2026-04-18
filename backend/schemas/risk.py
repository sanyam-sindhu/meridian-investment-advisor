RISK_SCHEMA = {
    "type": "object",
    "properties": {
        "risk_metrics_calculated": {"type": "integer"},
        "compliance_checks": {"type": "integer"},
        "risk_events": {"type": "integer"},
        "risk_score": {"type": "integer", "minimum": 0, "maximum": 100},
        "sharpe_ratio": {"type": "number"},
        "sortino_ratio": {"type": "number"},
        "findings": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "risk_metrics_calculated", "compliance_checks", "risk_events",
        "risk_score", "findings",
    ],
}
