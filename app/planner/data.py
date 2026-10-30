"""Static data tables, multipliers, percentages, and curated benchmark values.

All figures in this module are illustrative planning benchmarks and estimates
for Indian event planning, not real commercial quotations or contracted rates.
These constants ensure deterministic planning without hidden magic numbers.
"""

from typing import Dict, List, Tuple

# =====================================================================
# Base Category Allocations (Pre-Contingency, each event type sums to 100.0)
# =====================================================================

EVENT_BASE_ALLOCATIONS: Dict[str, Dict[str, Tuple[float, str]]] = {
    "wedding": {
        "Venue & Infrastructure": (
            25.0,
            "Mandap setup, banquet/lawn rental, seating, ambient lighting, and essential facilities."
        ),
        "Catering & Hospitality": (
            35.0,
            "Multi-course regional feast, welcome beverages, live food stations, and service crew."
        ),
        "Decor & Floral Styling": (
            12.0,
            "Fresh marigold and traditional flowers, entrance arch, stage backdrop, and table accents."
        ),
        "Photography & Cinematography": (
            8.0,
            "Candid photographer, traditional camera crew, drone shots, and highlight album."
        ),
        "Attire, Hair & Makeup": (
            10.0,
            "Bridal/groom wedding attire, ceremonial jewellery styling, and artist packages."
        ),
        "Ceremony & Rituals": (
            5.0,
            "Pandit/priest honorarium, samagri, havan materials, and auspicious puja items."
        ),
        "Entertainment & Music": (
            5.0,
            "DJ, dhol players, sound equipment, and sangeet choreography essentials."
        ),
    },
    "birthday": {
        "Food & Beverages": (
            40.0,
            "Buffet spread, kids/adult beverages, party starters, and service staff."
        ),
        "Venue & Decor": (
            25.0,
            "Party hall or lawn rental, balloon styling, thematic banner, and lighting."
        ),
        "Entertainment & Activities": (
            15.0,
            "Emcee/anchor, games coordinator, magic show, tattoo/mehendi artist, or music."
        ),
        "Cake & Confectionery": (
            8.0,
            "Custom-designed themed birthday cake, dessert table treats, and candles."
        ),
        "Return Gifts & Favors": (
            12.0,
            "Personalized party favors, branded gift hampers, or activity kits for attendees."
        ),
    },
    "community": {
        "Venue, Permits & Security": (
            20.0,
            "Ground/auditorium rental, local authority permissions, police NOC, and security marshals."
        ),
        "Sound, Lighting & Stage": (
            25.0,
            "Heavy-duty PA system, stage trussing, spotlights, generator backup, and mic consoles."
        ),
        "Food, Prasadam & Water": (
            30.0,
            "Community kitchen / langar / prasadam distribution, drinking water dispensers, and biodegradable cutlery."
        ),
        "Festive Decor & Ambience": (
            15.0,
            "Fabric drapery, decorative entrance gate, torans, fairy lights, and seating tents."
        ),
        "Volunteer & Logistics Support": (
            10.0,
            "Signage banners, first aid booth, volunteer t-shirts/badges, crowd control barriers, and sanitization."
        ),
    },
}

# =====================================================================
# City Tier Multipliers & Category Weight Adjustments
# =====================================================================

CITY_TIER_MULTIPLIERS: Dict[str, float] = {
    "metro": 1.25,   # Mumbai, Delhi NCR, Bengaluru, Hyderabad, Chennai, Kolkata, Pune
    "tier2": 1.00,   # Jaipur, Lucknow, Ahmedabad, Chandigarh, Kochi, etc.
    "tier3": 0.80,   # Smaller towns and district centers
}

# In metros, real estate and specialized production services command higher shares.
# In tier-3 towns, hospitality and community food make up a larger proportion.
CITY_TIER_CATEGORY_WEIGHT_MODIFIERS: Dict[str, Dict[str, float]] = {
    "metro": {
        "Venue & Infrastructure": 1.10,
        "Venue & Decor": 1.10,
        "Venue, Permits & Security": 1.10,
        "Photography & Cinematography": 1.10,
        "Attire, Hair & Makeup": 1.05,
        "Catering & Hospitality": 0.95,
        "Food & Beverages": 0.95,
        "Food, Prasadam & Water": 0.95,
    },
    "tier2": {},  # Baseline weights
    "tier3": {
        "Venue & Infrastructure": 0.90,
        "Venue & Decor": 0.90,
        "Venue, Permits & Security": 0.90,
        "Photography & Cinematography": 0.90,
        "Catering & Hospitality": 1.08,
        "Food & Beverages": 1.08,
        "Food, Prasadam & Water": 1.08,
    },
}

# =====================================================================
# Seasonality Multipliers & Calendar Bands
# =====================================================================

PEAK_WEDDING_MONTHS: List[int] = [1, 2, 11, 12]       # Auspicious dates (Muhurat heavy)
PEAK_FESTIVE_MONTHS: List[int] = [9, 10, 11]          # Ganesh Utsav, Navratri, Diwali
OFF_SEASON_MONTHS: List[int] = [5, 6, 7, 8]           # Summer & Monsoon

SEASON_COST_MULTIPLIERS: Dict[str, float] = {
    "peak_wedding": 1.20,
    "peak_festive": 1.15,
    "regular": 1.00,
    "off_season": 0.88,
}

# Category sensitivity during peak seasons (venues and floral decor surge most)
PEAK_SEASON_CATEGORY_MODIFIERS: Dict[str, float] = {
    "Venue & Infrastructure": 1.12,
    "Venue & Decor": 1.10,
    "Venue, Permits & Security": 1.10,
    "Decor & Floral Styling": 1.10,
    "Festive Decor & Ambience": 1.10,
    "Photography & Cinematography": 1.05,
}

# =====================================================================
# Environment Adjustments (Indoor vs Outdoor)
# =====================================================================

OUTDOOR_CATEGORY_MODIFIERS: Dict[str, float] = {
    "Venue & Infrastructure": 1.10,   # Rain-proofing, pagoda tents, portable washrooms
    "Decor & Floral Styling": 1.10,   # Heavy-duty framing and weather-resistant florals
    "Sound, Lighting & Stage": 1.12,  # Silent generator sets and extended wiring
    "Festive Decor & Ambience": 1.10,
}

# =====================================================================
# Guest Count Scaling & Tier Thresholds
# =====================================================================

GUEST_TIERS = {
    "intimate": (5, 50),
    "medium": (51, 250),
    "grand": (251, 800),
    "mega": (801, 5000),
}

# Scale adjustments: For large gatherings, food dominates; for small ones, fixed costs dominate
GUEST_COUNT_CATEGORY_MODIFIERS: Dict[str, Dict[str, float]] = {
    "intimate": {
        "Catering & Hospitality": 0.88,
        "Food & Beverages": 0.90,
        "Food, Prasadam & Water": 0.90,
        "Venue & Infrastructure": 1.10,
        "Photography & Cinematography": 1.12,
        "Decor & Floral Styling": 1.08,
    },
    "medium": {},  # Balanced
    "grand": {
        "Catering & Hospitality": 1.08,
        "Food & Beverages": 1.08,
        "Food, Prasadam & Water": 1.08,
        "Photography & Cinematography": 0.92,
        "Attire, Hair & Makeup": 0.90,
    },
    "mega": {
        "Catering & Hospitality": 1.15,
        "Food & Beverages": 1.15,
        "Food, Prasadam & Water": 1.15,
        "Photography & Cinematography": 0.85,
        "Attire, Hair & Makeup": 0.80,
    },
}

# =====================================================================
# Dietary Preference Adjustments
# =====================================================================

# Specialized preparation (Jain separate rootless prep, Vegan specific dairy substitutes,
# Non-veg premium meats, Halal sourcing) slightly shifts the catering budget share.
DIETARY_CATERING_MODIFIERS: Dict[str, float] = {
    "jain": 1.04,        # Dedicated kitchen utensils, non-root vegetables, specialized sweets
    "vegan": 1.05,       # Plant milks, dairy-free ghee & paneer substitutes
    "non-veg": 1.06,     # Premium mutton, poultry, fish courses
    "halal": 1.04,       # Certified meat procurement and segregation
    "sattvic": 1.02,     # Pure desi ghee, specialized ayurvedic/organic produce
    "vegetarian": 1.00,  # Standard baseline
}

# =====================================================================
# Realistic Cost-per-Guest Floors (INR)
# =====================================================================

# Baseline realistic floor costs per guest in Tier-2 cities (illustrative benchmarks)
BASE_BUDGET_FLOORS_PER_GUEST_INR: Dict[str, float] = {
    "wedding": 1200.0,    # Minimum for modest hall, single wedding meal, basic ritual setup
    "birthday": 350.0,    # Minimum for casual party snacks, basic cake, simple balloons
    "community": 150.0,   # Minimum for community ground hire, basic sound, simple prasadam
}

# Feasibility Ratio Thresholds (Actual Cost Per Guest / Floor Cost Per Guest)
FEASIBILITY_RATIO_COMFORTABLE = 1.30
FEASIBILITY_RATIO_TIGHT = 1.00

# Contingency Bounds
CONTINGENCY_MIN_PCT = 5.0
CONTINGENCY_MAX_PCT = 10.0
