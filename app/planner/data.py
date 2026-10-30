"""Static data tables, multipliers, percentages, and curated fallback ideas.

All baseline monetary figures and percentage allocations are maintained here
as immutable configuration constants to avoid magic numbers.
"""

from typing import Dict, List

# City Tier Cost Multipliers
CITY_TIER_MULTIPLIERS: Dict[str, float] = {
    "metro": 1.25,
    "tier2": 1.00,
    "tier3": 0.80,
}

# Seasonal Cost Multipliers
# Indian wedding seasons typically peak in Nov-Dec and Jan-Feb; festive seasons in Sep-Nov.
PEAK_WEDDING_MONTHS: List[int] = [1, 2, 11, 12]
PEAK_FESTIVE_MONTHS: List[int] = [9, 10, 11]

# Realistic Minimum Per-Guest Cost Floors (INR) in Tier-2
BUDGET_FLOORS_PER_GUEST_INR: Dict[str, float] = {
    "wedding": 1200.0,
    "birthday": 350.0,
    "community": 150.0,
}
