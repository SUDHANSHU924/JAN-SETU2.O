"""Static coordinate-to-ward mapping helpers.

TODO: Replace with real polygon/GeoJSON lookup using shapely when GeoJSON ward boundaries are available
"""

from __future__ import annotations

import re


def get_ward_from_coordinates(lat: float, lng: float) -> str:
    """Map latitude/longitude to a ward name using static bounding boxes."""
    if 19.10 <= lat <= 19.15 and 72.82 <= lng <= 72.88:
        return "Ward 05 - Andheri West"
    if 19.05 <= lat <= 19.10 and 72.88 <= lng <= 72.95:
        return "Ward 07 - Kurla"
    if 19.15 <= lat <= 19.22 and 72.83 <= lng <= 72.90:
        return "Ward 03 - Borivali"
    if 18.90 <= lat <= 18.96 and 72.82 <= lng <= 72.88:
        return "Ward 12 - Dadar"
    return "Ward 00 - General Zone"


def get_zone_room(ward: str) -> str:
    """Convert a ward string into a Socket.io room name."""
    normalized = re.sub(r"[^a-z0-9]+", "-", ward.strip().lower()).strip("-")
    return f"zone:{normalized}"


if __name__ == "__main__":
    assert get_ward_from_coordinates(19.12, 72.85) == "Ward 05 - Andheri West"
    assert get_ward_from_coordinates(19.08, 72.90) == "Ward 07 - Kurla"
    assert get_ward_from_coordinates(19.18, 72.86) == "Ward 03 - Borivali"
    assert get_ward_from_coordinates(18.92, 72.85) == "Ward 12 - Dadar"
    assert get_ward_from_coordinates(20.0, 73.0) == "Ward 00 - General Zone"
    assert get_zone_room("Ward 05 - Andheri West") == "zone:ward-05-andheri-west"
    print("geo_mapper.py self-test passed")
