"""Utilities for calculating grievance SLA values and deadlines."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone


BASE_SLA_DAYS = {
    "Water Supply": 3,
    "Roads": 7,
    "Electricity": 2,
    "Health": 3,
    "General": 10,
}

PRIORITY_MULTIPLIERS = {
    "HIGH": 0.4,
    "MEDIUM": 1.0,
    "LOW": 1.8,
}


def calculate_sla(category: str, priority: str) -> float:
    """Calculate SLA days from complaint category and priority.

    Final SLA = round(base_days * multiplier, 1)
    """
    base_days = BASE_SLA_DAYS.get(category, BASE_SLA_DAYS["General"])
    multiplier = PRIORITY_MULTIPLIERS.get(priority.upper(), 1.0)
    return round(base_days * multiplier, 1)


def calculate_sla_deadline(category: str, priority: str) -> datetime:
    """Return UTC deadline by adding the SLA days to the current UTC time."""
    sla_days = calculate_sla(category, priority)
    return datetime.now(timezone.utc) + timedelta(days=sla_days)


if __name__ == "__main__":
    assert calculate_sla("Water Supply", "HIGH") == 1.2
    assert calculate_sla("Roads", "LOW") == 12.6
    assert calculate_sla("Unknown", "MEDIUM") == 10.0

    deadline = calculate_sla_deadline("Health", "HIGH")
    assert isinstance(deadline, datetime)

    print("sla_service.py self-test passed")
