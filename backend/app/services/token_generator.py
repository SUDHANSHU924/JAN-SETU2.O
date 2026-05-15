"""Utilities for generating grievance tracking tokens."""

from __future__ import annotations

from datetime import datetime
from random import randint
from unittest.mock import patch


CATEGORY_CODES = {
    "Water Supply": "WTR",
    "Roads": "RDS",
    "Electricity": "ELC",
    "Health": "HLT",
    "General": "GEN",
}


def _normalize_ward_code(ward: str) -> str:
    """Uppercase the ward string, remove spaces, and cap at 8 characters."""
    return ward.upper().replace(" ", "")[:8]


def generate_tracking_token(category: str, ward: str) -> str:
    """Generate a complaint tracking token.

    Format: JS-{CAT_CODE}-{WARD_CODE}-{YEAR}-{RANDOM_4_DIGIT}
    """
    category_code = CATEGORY_CODES.get(category, CATEGORY_CODES["General"])
    ward_code = _normalize_ward_code(ward)
    year = datetime.now().year
    random_number = randint(1000, 9999)
    return f"JS-{category_code}-{ward_code}-{year}-{random_number}"


if __name__ == "__main__":
    current_year = datetime.now().year
    module_name = __name__

    with patch(f"{module_name}.randint", return_value=4421):
        assert generate_tracking_token("Water Supply", "Ward 05") == (
            f"JS-WTR-WARD05-{current_year}-4421"
        )

    with patch(f"{module_name}.randint", return_value=1234):
        assert generate_tracking_token("Unknown Category", "New Ward") == (
            f"JS-GEN-NEWWARD-{current_year}-1234"
        )

    print("token_generator.py self-test passed")
