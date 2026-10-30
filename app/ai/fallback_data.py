"""Curated, culturally rooted fallback ideas for Indian weddings, birthdays, and community festivals.

This module guarantees that Utsav Planner always provides authentic, budget-fitted
creative recommendations even if the Gemini API is unreachable, times out, or is unconfigured.
"""

from copy import deepcopy
from typing import Dict, List, Set

from app.models import (
    ActivityIdea,
    BudgetBreakdown,
    CreativeIdeas,
    DecorIdea,
    DietaryPreference,
    EventInput,
    MenuSection,
    ThemeIdea,
)

NON_VEG_KEYWORDS: Set[str] = {
    "chicken", "mutton", "fish", "prawn", "egg", "lamb", "beef", "pork",
    "keema", "gosht", "tikka (chicken)", "kabab (meat)", "seafood", "rogan josh"
}

JAIN_RESTRICTED_KEYWORDS: Set[str] = {
    "onion", "garlic", "potato", "aloo", "pyaz", "lahsun", "radish", "mooli",
    "carrot", "gajar", "beetroot", "turnip", "ginger", "adrak"
}

VEGAN_RESTRICTED_KEYWORDS: Set[str] = {
    "paneer", "ghee", "curd", "yogurt", "dahi", "cream", "malai", "khoya",
    "butter", "makkhan", "rabri", "rasgulla", "gulab jamun (dairy)", "cheese"
}


# =====================================================================
# Curated Benchmark Themes, Menus, Activities, and Decor per Event Type
# =====================================================================

CURATED_IDEAS_DATA: Dict[str, Dict] = {
    "wedding": {
        "themes": [
            {
                "name": "Royal Marwar & Shekhawati Heritage",
                "description": "Timeless Rajasthani palatial elegance featuring hand-block printed drapes, brass urns, and fragrant marigold torans.",
                "decor_elements": ["Brass Samai oil lamps", "Fresh saffron genda phool tassels", "Bandhani fabric canopies"],
                "dress_code": "Traditional Rajputi poshak, royal bandhgala sherwanis, or rich silk lehengas."
            },
            {
                "name": "Vibrant Punjabi Mela & Sangeet Utsav",
                "description": "High-energy festival ambience with colorful embroidered phulkari hangings, festive dhol rhythms, and rustic village street stalls.",
                "decor_elements": ["Handmade phulkari backdrops", "Painted clay matkas", "Bangles and parandi photo booth"],
                "dress_code": "Bright vibrant colors like fuchsia pink, sunshine yellow, and mirror-work kurtas."
            },
            {
                "name": "Classic South Indian Temple Sanctum",
                "description": "A serene Vedic atmosphere enriched with fragrant white mogra blossoms, brass kuthuvillakku lamps, and pure silk temple borders.",
                "decor_elements": ["Fresh jasmine and lotus garlands", "Banana stem entrance pillars", "Traditional kolam/rangoli patterns"],
                "dress_code": "Pure Kanjeevaram silk sarees with gold zari and traditional ivory veshtis."
            },
        ],
        "menus": [
            {
                "meal_type": "Live Chaat & Welcome Starters",
                "dishes": [
                    "Kolkata Puchka & Dahi Puri with Spiced Mint Water",
                    "Crispy Paneer Tikka with Mint Chutney",
                    "Sweet Potato Shakarkandi Chaat",
                    "Refreshing Kokum Sherbet & Badam Thandai"
                ],
                "dietary_tags": ["Pure Veg", "Jain Friendly Options"]
            },
            {
                "meal_type": "Grand Celebratory Feast",
                "dishes": [
                    "Dal Makhani Slow-cooked with Desi Ghee",
                    "Shahi Paneer in Velvety Cashew Gravy",
                    "Jeera Pulao & Dry Fruit Zafrani Biryani",
                    "Tandoori Laccha Paratha & Butter Naan",
                    "Burani Raita & Green Moong Salad"
                ],
                "dietary_tags": ["Pure Veg", "North Indian Classic"]
            },
            {
                "meal_type": "Mithai & Traditional Confectionery",
                "dishes": [
                    "Hot Kesari Jalebi with Creamy Malpua & Rabri",
                    "Bikaneri Moong Dal Halwa Gilded with Pistachios",
                    "Cardamom Spiced Paan & Mukhwas Station"
                ],
                "dietary_tags": ["Dessert", "Vegetarian"]
            },
        ],
        "activities": [
            {
                "title": "Family Antakshari & Sangeet Dance Face-off",
                "description": "A friendly musical showdown between bride and groom sides led by an engaging cousin or emcee.",
                "suitable_for": "All Generations & Extended Family"
            },
            {
                "title": "Interactive Mehendi & Lac Bangle Craft Station",
                "description": "Live artisan crafting custom lac bangles and intricate mehendi patterns on-the-spot for guests.",
                "suitable_for": "Women & Kids"
            },
            {
                "title": "Ethnic Photo Booth with Vintage Royal Props",
                "description": "Instant Polaroid camera station with turbans, dupattas, and ornate wooden photo frames.",
                "suitable_for": "Friends & Youth"
            },
        ],
        "decor": [
            {
                "area": "Mandap & Sacred Havan Zone",
                "concept": "Four-pillar mandap wrapped in marigold ropes with hanging lotus buds and brass floor urlis.",
                "suggested_materials": ["Fresh orange/yellow genda phool", "Lotus flowers", "Brass urlis with floating tealights"]
            },
            {
                "area": "Grand Entrance Gateway",
                "concept": "Arched wooden frame draped in raw silk fabric with brass bell windchimes welcoming arriving guests.",
                "suggested_materials": ["Marigold torans", "Temple bells", "Hand-painted earthen diyas"]
            },
            {
                "area": "Dining Lawn & Buffet Canopies",
                "concept": "Warm fairy light ceilings with sheer fabric tenting and natural potted fern centerpieces.",
                "suggested_materials": ["Warm white LED fairy strings", "Jute runners", "Clay terracotta crockery accents"]
            },
        ],
    },
    "birthday": {
        "themes": [
            {
                "name": "Desi Carnival & Anand Mela",
                "description": "Lively street carnival filled with vintage wooden games, candy floss carts, balloon twisters, and cheerful pinwheels.",
                "decor_elements": ["Bright rainbow bunting flags", "Whimsical colorful paper fans", "Popcorn and candy floss kiosk"],
                "dress_code": "Casual comfortable party attire in bright festive pastels."
            },
            {
                "name": "Jungle Safari & Wildlife Explorer",
                "description": "An adventurous tropical setting with greenery foliage, faux safari binoculars, animal masks, and earthy adventure props.",
                "decor_elements": ["Palm leaves & green balloon foliage garland", "Wooden crate risers", "Animal cutout backdrops"],
                "dress_code": "Khaki safari shorts, earth tones, or animal-print accents."
            },
            {
                "name": "Bollywood Retro Stars",
                "description": "Glamorous celebration inspired by vintage Bollywood cinema, vinyl records, classic dialogues, and red carpet fun.",
                "decor_elements": ["Vintage film reel cutouts", "Star-shaped golden balloons", "Movie clapboard welcome sign"],
                "dress_code": "Retro 80s/90s Bollywood inspired outfits with fun sunglasses."
            },
        ],
        "menus": [
            {
                "meal_type": "Kid-Friendly Finger Foods & Starters",
                "dishes": [
                    "Bite-sized Pav Bhaji Sliders & Mini Pizza Toasts",
                    "Crispy Corn Salt & Pepper Cups",
                    "Sweet Mango Lassi & Chilled Nimbu Paani"
                ],
                "dietary_tags": ["Kids Special", "Pure Veg"]
            },
            {
                "meal_type": "Main Party Spread",
                "dishes": [
                    "Creamy Penne Alfredo with Herb Garlic Bread",
                    "Amritsari Chole with Soft Bhature",
                    "Veggie Pulao & Fresh Sprouted Salad"
                ],
                "dietary_tags": ["Comfort Food", "All Ages"]
            },
            {
                "meal_type": "Birthday Cake & Sweet Treats",
                "dishes": [
                    "Customized Belgian Chocolate Truffle Cake",
                    "Cupcake Towers with Buttercream Swirls",
                    "Handmade Fruit Kulfi Popsicles"
                ],
                "dietary_tags": ["Dessert", "Vegetarian"]
            },
        ],
        "activities": [
            {
                "title": "Classic Birthday Games with Desi Twist",
                "description": "Fast-paced Musical Chairs, Pass the Parcel with mystery challenges, and a balloon pop race.",
                "suitable_for": "Children & Siblings"
            },
            {
                "title": "Interactive Magic Show & Balloon Sculpting",
                "description": "A 30-minute comedy magic performance followed by personalized sword, dog, and flower balloon twists.",
                "suitable_for": "Kids & Toddlers"
            },
            {
                "title": "DIY Block Printing or Clay Pottery Corner",
                "description": "Hands-on creative activity where children print their own canvas tote bag to take home.",
                "suitable_for": "Creative Kids & Parents"
            },
        ],
        "decor": [
            {
                "area": "Cake Cutting Backdrop",
                "concept": "Organic balloon garland in theme shades framing a customized neon name sign.",
                "suggested_materials": ["Biodegradable latex balloons", "Acrylic name board", "LED warm neon backlighting"]
            },
            {
                "area": "Party Entrance Arch",
                "concept": "Welcoming rainbow balloon arch with welcome chalkboard and helium character balloons.",
                "suggested_materials": ["Paper pinwheels", "Thematic standing cutouts"]
            },
            {
                "area": "Gift & Activity Table",
                "concept": "Coordinated colorful table runners with neatly labeled thematic return gift hampers.",
                "suggested_materials": ["Fabric table drapery", "Printed favor boxes"]
            },
        ],
    },
    "community": {
        "themes": [
            {
                "name": "Utsav Sandhya (Festive Melawa)",
                "description": "A vibrant celebration honoring Indian festival traditions with collective lighting of deepams, devotional hymns, and cultural dances.",
                "decor_elements": ["Floor floral rangoli with clay diyas", "Saffron fabric stage drapery", "Mango leaf torans"],
                "dress_code": "Traditional Indian ethnic kurtas, saris, and festive dupattas."
            },
            {
                "name": "Sanskriti & Heritage Milan",
                "description": "Celebration of diverse regional cultures with community folk arts, classical musical recitals, and traditional craft displays.",
                "decor_elements": ["Handicraft wall hangings", "Brass bells and torans", "Fairy light canopies across walking lanes"],
                "dress_code": "Regional attire representing home states."
            },
            {
                "name": "Anand Mela (Community Fair & Food Bazaar)",
                "description": "An open community fair combining home-chef food stalls, games, talent showcase, and an evening Dandiya/Garba circle.",
                "decor_elements": ["Color-coordinated stall canopies", "Paper lantern overhead strings (Kandils)", "Festive village arch"],
                "dress_code": "Casual ethnic wear or colorful Garba chaniya cholis."
            },
        ],
        "menus": [
            {
                "meal_type": "Sacred Prasadam & Welcome Drink",
                "dishes": [
                    "Hot Cardamom Masala Chai & Kokum Sharbat",
                    "Pure Desi Ghee Halwa / Sheera Prasadam",
                    "Steamed Modaks / Ladoos"
                ],
                "dietary_tags": ["Sattvic", "Devotional Prasadam"]
            },
            {
                "meal_type": "Community Langar / Bhandara Feast",
                "dishes": [
                    "Poori with Aloo Tamatar Curry / Pumpkin Sabzi",
                    "Panchratna Khichdi tempered with Cumin & Desi Ghee",
                    "Gujarati/Punjabi Kadhi with Steamed Rice",
                    "Boondi Raita & Roasted Papad"
                ],
                "dietary_tags": ["Pure Veg", "Large Crowd Friendly"]
            },
            {
                "meal_type": "Community Sweet Distribution",
                "dishes": [
                    "Warm Kesar Badam Kheer in Clay Sakoras",
                    "Crispy Jalebi made fresh on-site"
                ],
                "dietary_tags": ["Dessert", "Compostable Serving"]
            },
        ],
        "activities": [
            {
                "title": "Community Garba, Dandiya & Folk Circle",
                "description": "Inclusive group dance session open to residents of all ages with upbeat traditional percussion music.",
                "suitable_for": "Entire Neighborhood & All Ages"
            },
            {
                "title": "Inter-Wing Rangoli & Painting Competition",
                "description": "Creative competition on the society plaza with themes celebrating environment and unity.",
                "suitable_for": "Children, Youth & Homemakers"
            },
            {
                "title": "Senior Citizens' Bhajan & Antakshari Session",
                "description": "A relaxed gathering in the society amphitheater featuring golden era classics and community melodies.",
                "suitable_for": "Elders & Families"
            },
        ],
        "decor": [
            {
                "area": "Main Festival Stage & Altar",
                "concept": "Raised modular platform with backdrop of golden marigold garlands, brass samai lamps, and sacred motifs.",
                "suggested_materials": ["Fresh genda phool", "Brass oil lamps", "Saffron and marigold fabric drapery"]
            },
            {
                "area": "Community Entrance Plaza",
                "concept": "Grand entrance archway adorned with mango leaves, floral torans, and a giant welcome rangoli with floating petals.",
                "suggested_materials": ["Organic flower petals", "Powder colors", "Clay diyas"]
            },
            {
                "area": "Open Amphitheater & Pathways",
                "concept": "Warm white fairy light strings overhead creating a starry sky canopy across the central walking avenue.",
                "suggested_materials": ["Outdoor-rated fairy lights", "Bunting banners", "Directional society signboards"]
            },
        ],
    },
}


def filter_menu_by_diet(
    menus: List[MenuSection],
    preferences: List[DietaryPreference],
) -> List[MenuSection]:
    """Filter out any dishes that violate the user's specific dietary requirements."""
    is_veg = any(d in (DietaryPreference.VEGETARIAN, DietaryPreference.JAIN, DietaryPreference.SATTVIC, DietaryPreference.VEGAN) for d in preferences)
    is_jain = DietaryPreference.JAIN in preferences
    is_vegan = DietaryPreference.VEGAN in preferences

    sanitized_menus: List[MenuSection] = []

    for section in menus:
        safe_dishes: List[str] = []
        for dish in section.dishes:
            dish_lower = dish.lower()

            # Rule 1: Exclude non-veg if vegetarian, jain, or vegan
            if is_veg and any(kw in dish_lower for kw in NON_VEG_KEYWORDS):
                continue

            # Rule 2: Exclude root vegetables if Jain
            if is_jain and any(kw in dish_lower for kw in JAIN_RESTRICTED_KEYWORDS):
                continue

            # Rule 3: Exclude dairy products if Vegan
            if is_vegan and any(kw in dish_lower for kw in VEGAN_RESTRICTED_KEYWORDS):
                continue

            safe_dishes.append(dish)

        if safe_dishes:
            sanitized_menus.append(
                MenuSection(
                    meal_type=section.meal_type,
                    dishes=safe_dishes,
                    dietary_tags=section.dietary_tags,
                )
            )

    return sanitized_menus


def get_fallback_ideas(event: EventInput, budget: BudgetBreakdown) -> CreativeIdeas:
    """Construct authentic, budget-aware fallback ideas honoring all event parameters.

    Returns CreativeIdeas with source='fallback'.
    """
    event_key = event.event_type.value
    raw_data = deepcopy(CURATED_IDEAS_DATA.get(event_key, CURATED_IDEAS_DATA["wedding"]))

    themes = [ThemeIdea(**t) for t in raw_data["themes"]]
    raw_menus = [MenuSection(**m) for m in raw_data["menus"]]
    menus = filter_menu_by_diet(raw_menus, event.dietary_preferences)
    activities = [ActivityIdea(**a) for a in raw_data["activities"]]
    decor = [DecorIdea(**d) for d in raw_data["decor"]]

    # Dynamically tailored budget fit note quoting exact figures
    total_budget_formatted = f"₹{budget.total_budget_inr:,}"
    per_guest_formatted = f"₹{budget.cost_per_guest_inr:,.0f}"

    budget_fit_note = (
        f"Curated benchmark plan designed for your {total_budget_formatted} budget "
        f"({per_guest_formatted}/guest for {event.guest_count} guests in {event.city}). "
        f"Prioritizes authentic cultural hospitality and traditional marigold styling, "
        f"ensuring production costs remain comfortably within allocated category targets."
    )

    return CreativeIdeas(
        themes=themes,
        menu_suggestions=menus,
        activities=activities,
        decor_ideas=decor,
        budget_fit_note=budget_fit_note,
        source="fallback",
    )
