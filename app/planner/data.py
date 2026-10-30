"""Static data tables, multipliers, percentages, and curated benchmark values.

All figures in this module are illustrative planning benchmarks and estimates
for Indian event planning, not real commercial quotations or contracted rates.
These constants ensure deterministic planning without hidden magic numbers.
"""

from typing import Any, Dict, List, Tuple

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
    "tier2": {},
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

PEAK_WEDDING_MONTHS: List[int] = [1, 2, 11, 12]
PEAK_FESTIVE_MONTHS: List[int] = [9, 10, 11]
OFF_SEASON_MONTHS: List[int] = [5, 6, 7, 8]

SEASON_COST_MULTIPLIERS: Dict[str, float] = {
    "peak_wedding": 1.20,
    "peak_festive": 1.15,
    "regular": 1.00,
    "off_season": 0.88,
}

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
    "Venue & Infrastructure": 1.10,
    "Decor & Floral Styling": 1.10,
    "Sound, Lighting & Stage": 1.12,
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

GUEST_COUNT_CATEGORY_MODIFIERS: Dict[str, Dict[str, float]] = {
    "intimate": {
        "Catering & Hospitality": 0.88,
        "Food & Beverages": 0.90,
        "Food, Prasadam & Water": 0.90,
        "Venue & Infrastructure": 1.10,
        "Photography & Cinematography": 1.12,
        "Decor & Floral Styling": 1.08,
    },
    "medium": {},
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

DIETARY_CATERING_MODIFIERS: Dict[str, float] = {
    "jain": 1.04,
    "vegan": 1.05,
    "non-veg": 1.06,
    "halal": 1.04,
    "sattvic": 1.02,
    "vegetarian": 1.00,
}

# =====================================================================
# Realistic Cost-per-Guest Floors (INR)
# =====================================================================

BASE_BUDGET_FLOORS_PER_GUEST_INR: Dict[str, float] = {
    "wedding": 1200.0,
    "birthday": 350.0,
    "community": 150.0,
}

FEASIBILITY_RATIO_COMFORTABLE = 1.30
FEASIBILITY_RATIO_TIGHT = 1.00

CONTINGENCY_MIN_PCT = 5.0
CONTINGENCY_MAX_PCT = 10.0

# =====================================================================
# Timeline & Scheduling Constants
# =====================================================================

CRUNCH_PLAN_DAYS_THRESHOLD = 14
DUE_SOON_DAYS_THRESHOLD = 14
LARGE_GATHERING_VOLUNTEER_THRESHOLD = 300

TIMELINE_TASK_TEMPLATES: Dict[str, List[Dict[str, Any]]] = {
    "wedding": [
        {
            "id": "wed_venue",
            "title": "Finalize Wedding & Reception Venue",
            "category": "Venue & Infrastructure",
            "lead_time_days": 180,
            "priority": "critical",
            "dependencies": [],
            "alternative_advice": "Check municipal halls, society banquets, or consider an off-peak weekday date."
        },
        {
            "id": "wed_priest",
            "title": "Confirm Priest & Muhurtham Timings",
            "category": "Ceremony & Rituals",
            "lead_time_days": 150,
            "priority": "critical",
            "dependencies": [],
            "alternative_advice": "Approach local community temple purohits or trusted family elders for auspicious lagna windows."
        },
        {
            "id": "wed_attire",
            "title": "Procure Wedding Attire & Ceremonial Jewellery",
            "category": "Attire, Hair & Makeup",
            "lead_time_days": 120,
            "priority": "important",
            "dependencies": [],
            "alternative_advice": "Opt for designer rental boutiques or off-the-rack heritage collections with express alteration."
        },
        {
            "id": "wed_caterer",
            "title": "Book Wedding Caterer & Finalize Menu Spread",
            "category": "Catering & Hospitality",
            "lead_time_days": 100,
            "priority": "critical",
            "dependencies": ["wed_venue"],
            "alternative_advice": "Select an established local caterer's popular fixed-menu package with standard live counters."
        },
        {
            "id": "wed_decor",
            "title": "Book Decorator for Mandap & Stage Styling",
            "category": "Decor & Floral Styling",
            "lead_time_days": 75,
            "priority": "important",
            "dependencies": ["wed_venue"],
            "alternative_advice": "Switch to traditional fabric drapery, brass diyas, and locally sourced marigold florals."
        },
        {
            "id": "wed_photo",
            "title": "Hire Photographer & Cinematographer",
            "category": "Photography & Cinematography",
            "lead_time_days": 60,
            "priority": "important",
            "dependencies": [],
            "alternative_advice": "Book a reputable freelance candid photographer for a single-day primary event package."
        },
        {
            "id": "wed_music",
            "title": "Book DJ, Sound System & Dhol Artists",
            "category": "Entertainment & Music",
            "lead_time_days": 45,
            "priority": "optional",
            "dependencies": [],
            "alternative_advice": "Curate high-energy digital family playlists and rent a powered sound console."
        },
        {
            "id": "wed_invites",
            "title": "Dispatch E-Invites & Physical Wedding Cards",
            "category": "Ceremony & Rituals",
            "lead_time_days": 35,
            "priority": "important",
            "dependencies": ["wed_venue", "wed_priest"],
            "alternative_advice": "Send interactive digital WhatsApp video invites with Google Forms RSVP tracking."
        },
        {
            "id": "wed_transport",
            "title": "Arrange Outstation Guest Transport & Rooms",
            "category": "Venue & Infrastructure",
            "lead_time_days": 25,
            "priority": "important",
            "dependencies": ["wed_venue"],
            "alternative_advice": "Book rooms in budget business hotels within 3 km or arrange coordinated cab vouchers."
        },
        {
            "id": "wed_headcount",
            "title": "Lock Final Attendee Count with Caterer",
            "category": "Catering & Hospitality",
            "lead_time_days": 10,
            "priority": "critical",
            "dependencies": ["wed_caterer"],
            "alternative_advice": "Directly call key family representatives and lock count with a +5% buffer."
        },
        {
            "id": "wed_coord",
            "title": "Day-of Rehearsal & Puja Samagri Kit Check",
            "category": "Ceremony & Rituals",
            "lead_time_days": 3,
            "priority": "critical",
            "dependencies": ["wed_priest"],
            "alternative_advice": "Designate 2 responsible cousins to inspect samagri checklists and vendor arrival times."
        },
    ],
    "birthday": [
        {
            "id": "bday_venue",
            "title": "Book Party Venue or Reserve Society Lawn",
            "category": "Venue & Decor",
            "lead_time_days": 30,
            "priority": "critical",
            "dependencies": [],
            "alternative_advice": "Host at the society clubhouse, terrace, or living room with compact balloon arches."
        },
        {
            "id": "bday_food",
            "title": "Book Food Catering or Party Platter Packages",
            "category": "Food & Beverages",
            "lead_time_days": 21,
            "priority": "critical",
            "dependencies": ["bday_venue"],
            "alternative_advice": "Order standardized party meal boxes or platters from a trusted local restaurant."
        },
        {
            "id": "bday_cake",
            "title": "Order Custom Themed Birthday Cake",
            "category": "Cake & Confectionery",
            "lead_time_days": 14,
            "priority": "critical",
            "dependencies": [],
            "alternative_advice": "Pick a delicious fresh-cream signature cake from an artisanal bakery with ready edible toppers."
        },
        {
            "id": "bday_entertainment",
            "title": "Book Emcee / Anchor, Magic Show, or Games Coordinator",
            "category": "Entertainment & Activities",
            "lead_time_days": 14,
            "priority": "important",
            "dependencies": [],
            "alternative_advice": "Organize interactive family games (Pass the Parcel, Musical Chairs, Trivia) with fun mini-prizes."
        },
        {
            "id": "bday_invites",
            "title": "Send Digital Invitations with RSVP Link",
            "category": "Venue & Decor",
            "lead_time_days": 10,
            "priority": "important",
            "dependencies": ["bday_venue"],
            "alternative_advice": "Broadcast personalized WhatsApp video cards requesting confirmed headcounts."
        },
        {
            "id": "bday_gifts",
            "title": "Source & Assemble Thematic Return Gifts",
            "category": "Return Gifts & Favors",
            "lead_time_days": 7,
            "priority": "important",
            "dependencies": [],
            "alternative_advice": "Pick up age-appropriate storybooks, seed kits, or puzzle packs from local retail stores."
        },
        {
            "id": "bday_headcount",
            "title": "Confirm Final Headcount with Food Provider",
            "category": "Food & Beverages",
            "lead_time_days": 3,
            "priority": "critical",
            "dependencies": ["bday_food"],
            "alternative_advice": "Lock final numbers with a 10% snack buffer for unexpected sibling arrivals."
        },
    ],
    "community": [
        {
            "id": "comm_permits",
            "title": "Apply for Municipal & Police Loudspeaker NOC",
            "category": "Venue, Permits & Security",
            "lead_time_days": 60,
            "priority": "critical",
            "dependencies": [],
            "alternative_advice": "Expedite file submission at local municipal ward office and jurisdictional police station."
        },
        {
            "id": "comm_ground",
            "title": "Secure Festival Ground or Society Amphitheater",
            "category": "Venue, Permits & Security",
            "lead_time_days": 45,
            "priority": "critical",
            "dependencies": ["comm_permits"],
            "alternative_advice": "Obtain written permission from society management committee for common area utilization."
        },
        {
            "id": "comm_sound",
            "title": "Book Heavy-Duty PA Sound & Silent Generator Backup",
            "category": "Sound, Lighting & Stage",
            "lead_time_days": 30,
            "priority": "critical",
            "dependencies": [],
            "alternative_advice": "Contract local sound vendor for compact dual-speaker PA setup and a 15kVA diesel generator."
        },
        {
            "id": "comm_stage",
            "title": "Set Up Stage Risers & Festive Illumination",
            "category": "Festive Decor & Ambience",
            "lead_time_days": 21,
            "priority": "important",
            "dependencies": ["comm_ground"],
            "alternative_advice": "Use modular steel risers draped in saffron/golden fabric with fairy light strings."
        },
        {
            "id": "comm_food",
            "title": "Arrange Community Prasadam & Drinking Water",
            "category": "Food, Prasadam & Water",
            "lead_time_days": 15,
            "priority": "critical",
            "dependencies": [],
            "alternative_advice": "Partner with a community trust kitchen or local halwai for hygienic pre-packed prasadam."
        },
        {
            "id": "comm_volunteers",
            "title": "Mobilize Volunteer Teams & Shift Rotations",
            "category": "Volunteer & Logistics Support",
            "lead_time_days": 10,
            "priority": "critical",
            "dependencies": [],
            "alternative_advice": "Form dedicated WhatsApp groups assigning leads for crowd queueing, stage, and prasadam lines."
        },
        {
            "id": "comm_publicity",
            "title": "Distribute Society Circulars & Event Banners",
            "category": "Venue, Permits & Security",
            "lead_time_days": 7,
            "priority": "important",
            "dependencies": [],
            "alternative_advice": "Post digital event flyers on resident notice boards and WhatsApp community channels."
        },
        {
            "id": "comm_safety",
            "title": "Establish First-Aid Station & Crowd Marshal Posts",
            "category": "Venue, Permits & Security",
            "lead_time_days": 4,
            "priority": "critical",
            "dependencies": [],
            "alternative_advice": "Keep certified fire extinguishers accessible and assign 4 volunteers wearing high-vis badges."
        },
        {
            "id": "comm_cleanup",
            "title": "Coordinate Waste Disposal & Society Sanitization",
            "category": "Volunteer & Logistics Support",
            "lead_time_days": 2,
            "priority": "critical",
            "dependencies": [],
            "alternative_advice": "Set up labeled wet/dry disposal bins and book municipal sweepers for morning collection."
        },
    ],
}

# =====================================================================
# Vendor Diligence Checklist Templates
# =====================================================================

CHECKLIST_BASE_TEMPLATES: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
    "wedding": {
        "Venue & Infrastructure": [
            {
                "id": "wed_chk_venue_1",
                "text": "Inspect venue air-conditioning, power load capacity, and generator backup provisions.",
                "item_type": "ask",
                "stage": "shortlist",
                "what_to_ask": [
                    "What is the maximum sanctioned power load?",
                    "Is silent generator fuel included in the venue rental quote?"
                ],
                "what_to_verify": [
                    "Check operational condition of bridal green rooms and attached washroom cleanliness."
                ]
            },
            {
                "id": "wed_chk_venue_2",
                "text": "Review venue contract cancellation, refund policies, and advance payment milestones.",
                "item_type": "document",
                "stage": "book",
                "what_to_ask": [
                    "What is the refund policy if dates must be rescheduled due to family emergencies?",
                    "Are there curfew penalties for events extending past 11 PM?"
                ],
                "what_to_verify": [
                    "Verify written booking confirmation with stamped advance payment receipt."
                ]
            },
        ],
        "Catering & Hospitality": [
            {
                "id": "wed_chk_cater_1",
                "text": "Conduct in-person food tasting session and examine FSSAI food safety registration.",
                "item_type": "verify",
                "stage": "shortlist",
                "what_to_ask": [
                    "Can we sample live counter items (e.g. chaat, dosa, jalebi) prior to locking the contract?",
                    "What is the per-plate rate and does it include cutlery, live counter gas, and service staff?"
                ],
                "what_to_verify": [
                    "Verify valid FSSAI food safety license/registration certificate of the catering vendor.",
                    "Verify backup plan if guest arrival exceeds planned headcount by 10-15%."
                ]
            },
            {
                "id": "wed_chk_cater_2",
                "text": "Lock finalized multi-course menu and payment schedule with caterer.",
                "item_type": "payment",
                "stage": "deposit",
                "what_to_ask": [
                    "What is the advance deposit required, and when is the post-event final settlement due?"
                ],
                "what_to_verify": [
                    "Ensure itemized written invoice stating dish counts, mineral water cans, and server uniforms."
                ]
            },
        ],
        "Decor & Floral Styling": [
            {
                "id": "wed_chk_decor_1",
                "text": "Finalize 3D layout of mandap, stage backdrop, and entrance walkway florals.",
                "item_type": "ask",
                "stage": "quote",
                "what_to_ask": [
                    "Are flowers 100% fresh or mixed with artificial silk varieties?",
                    "What time will the setup team get access to the venue on the event morning?"
                ],
                "what_to_verify": [
                    "Ensure structural safety of mandap pillars and heavy hanging chandeliers."
                ]
            },
        ],
        "Photography & Cinematography": [
            {
                "id": "wed_chk_photo_1",
                "text": "Review photographer deliverables, drone permissions, and raw footage handover schedule.",
                "item_type": "document",
                "stage": "quote",
                "what_to_ask": [
                    "How many candid vs traditional photographers and cinematographers will be present?",
                    "What is the expected turnaround time for the teaser reel and the final album?"
                ],
                "what_to_verify": [
                    "Review full unedited wedding album samples from recent client shoots, not just Instagram highlights."
                ]
            },
        ],
        "Attire, Hair & Makeup": [
            {
                "id": "wed_chk_attire_1",
                "text": "Schedule bridal hair & makeup trial and lock timing for ceremonial draping.",
                "item_type": "verify",
                "stage": "book",
                "what_to_ask": [
                    "Does the artist package cover family members, and do they travel to the venue?"
                ],
                "what_to_verify": [
                    "Check cosmetic product brands used to prevent unexpected skin allergies."
                ]
            },
        ],
        "Ceremony & Rituals": [
            {
                "id": "wed_chk_priest_1",
                "text": "Consult family priest (pundit) for auspicious Muhurtham timings and puja samagri list.",
                "item_type": "ask",
                "stage": "confirm",
                "what_to_ask": [
                    "What is the comprehensive list of havan and lagna items the family needs to procure?",
                    "What is the priest honorarium (dakshina) and arrival timing on the wedding morning?"
                ],
                "what_to_verify": [
                    "Confirm date and muhurtham hours with priest BEFORE signing the binding venue agreement."
                ]
            },
        ],
        "Entertainment & Music": [
            {
                "id": "wed_chk_music_1",
                "text": "Verify sound console limits, DJ music playlist, and local noise cutoff compliance.",
                "item_type": "verify",
                "stage": "confirm",
                "what_to_ask": [
                    "Can we submit a strict 'do-not-play' and preferred sangeet song list?",
                    "Is a wireless mic provided for family speeches and announcements?"
                ],
                "what_to_verify": [
                    "Check local municipal regulations regarding loudspeaker volume limits and 10 PM curfew."
                ]
            },
        ],
    },
    "birthday": {
        "Food & Beverages": [
            {
                "id": "bday_chk_food_1",
                "text": "Sample party starters, verify kid-friendly spice levels, and confirm FSSAI credentials.",
                "item_type": "verify",
                "stage": "quote",
                "what_to_ask": [
                    "Are starter options mild and suitable for young children?",
                    "What are the beverage replenishment and refill terms?"
                ],
                "what_to_verify": [
                    "Ensure clean FSSAI registration and hygienic food handling practices by staff."
                ]
            },
        ],
        "Venue & Decor": [
            {
                "id": "bday_chk_venue_1",
                "text": "Confirm party hall capacity, balloon hanging permissions, and music curfew.",
                "item_type": "ask",
                "stage": "book",
                "what_to_ask": [
                    "Are double-sided tape and balloon arches permitted on the walls?",
                    "What is the venue cleanup fee and deposit refund procedure?"
                ],
                "what_to_verify": [
                    "Inspect child-safe electrical sockets and emergency exit accessibility."
                ]
            },
        ],
        "Entertainment & Activities": [
            {
                "id": "bday_chk_ent_1",
                "text": "Coordinate games coordinator rundown, magic show duration, and sound system.",
                "item_type": "ask",
                "stage": "book",
                "what_to_ask": [
                    "What age-appropriate games will be conducted for the children?",
                    "Does the entertainer bring their own wireless speaker and microphone?"
                ],
                "what_to_verify": [
                    "Confirm entertainer's punctual arrival 30 minutes before guest invitation time."
                ]
            },
        ],
        "Cake & Confectionery": [
            {
                "id": "bday_chk_cake_1",
                "text": "Confirm cake flavor, theme design, delivery timeline, and transport refrigeration.",
                "item_type": "verify",
                "stage": "confirm",
                "what_to_ask": [
                    "Is the cake delivered directly to the venue in temperature-controlled packaging?"
                ],
                "what_to_verify": [
                    "Verify correct spelling of the name and age numeral on the cake topper."
                ]
            },
        ],
        "Return Gifts & Favors": [
            {
                "id": "bday_chk_gifts_1",
                "text": "Procure and assemble personalized return gift hampers with surplus count.",
                "item_type": "document",
                "stage": "confirm",
                "what_to_ask": [
                    "Can we order extra units at wholesale rates for unannounced guest siblings?"
                ],
                "what_to_verify": [
                    "Maintain a 15% buffer in return gift bags so no child attendee is left empty-handed."
                ]
            },
        ],
    },
    "community": {
        "Venue, Permits & Security": [
            {
                "id": "comm_chk_permit_1",
                "text": "Secure local municipal gathering NOC and police station loudspeaker permits.",
                "item_type": "document",
                "stage": "shortlist",
                "what_to_ask": [
                    "What are the specific decibel limits and evening cutoff times for outdoor sound?"
                ],
                "what_to_verify": [
                    "Obtain written stamp on the gathering application from jurisdictional police & municipal ward."
                ]
            },
            {
                "id": "comm_chk_permit_2",
                "text": "Obtain formal approval letter from Residents' Association (RWA) or society committee.",
                "item_type": "document",
                "stage": "book",
                "what_to_ask": [
                    "Are common area electricity and public water taps available for festival use?"
                ],
                "what_to_verify": [
                    "Verify written sanction from society president/secretary regarding dates and timings."
                ]
            },
        ],
        "Sound, Lighting & Stage": [
            {
                "id": "comm_chk_sound_1",
                "text": "Inspect generator backup with auto-changeover switch and sound system distribution.",
                "item_type": "verify",
                "stage": "book",
                "what_to_ask": [
                    "Does the sound vendor hold public performance music licenses where required?",
                    "How many backup microphones and audio patch chords are included?"
                ],
                "what_to_verify": [
                    "Verify silent diesel generator operational fuel capacity for continuous 6-hour operation."
                ]
            },
        ],
        "Food, Prasadam & Water": [
            {
                "id": "comm_chk_food_1",
                "text": "Verify hygienic community prasadam preparation, drinking water points, and compostable plates.",
                "item_type": "verify",
                "stage": "confirm",
                "what_to_ask": [
                    "How will hot prasadam be safely portioned and distributed to prevent queue bottlenecks?"
                ],
                "what_to_verify": [
                    "Ensure adequate 20L commercial drinking water dispensers with paper cups across the ground."
                ]
            },
        ],
        "Festive Decor & Ambience": [
            {
                "id": "comm_chk_decor_1",
                "text": "Inspect stage stability, barricading around deity / podium, and weather-proof canopies.",
                "item_type": "verify",
                "stage": "confirm",
                "what_to_ask": [
                    "Are stage lighting cables taped down securely to avoid attendee tripping hazards?"
                ],
                "what_to_verify": [
                    "Check sturdy barricading between audience seating and active stage production areas."
                ]
            },
        ],
        "Volunteer & Logistics Support": [
            {
                "id": "comm_chk_vol_1",
                "text": "Designate dedicated volunteer marshals for crowd safety, first-aid, and waste cleanup.",
                "item_type": "ask",
                "stage": "confirm",
                "what_to_ask": [
                    "Who is the assigned volunteer point person with the emergency key contact directory?"
                ],
                "what_to_verify": [
                    "Confirm fully stocked first-aid kit, certified ABC fire extinguishers, and post-event sweepers."
                ]
            },
        ],
    },
}

# Adaptation Checklist Items
OUTDOOR_CHECKLIST_ADDITIONS = {
    "wedding": {
        "Venue & Infrastructure": [
            {
                "id": "adapt_outdoor_rain_plan",
                "text": "Review outdoor weatherproof tenting, monsoon rain gutters, and industrial pedestal misting fans.",
                "item_type": "verify",
                "stage": "book",
                "what_to_ask": ["Is the German hangar tent 100% waterproof and rated for strong wind gusts?"],
                "what_to_verify": ["Verify covered dry passage connecting parking, buffet area, and the mandap."]
            }
        ]
    },
    "birthday": {
        "Venue & Decor": [
            {
                "id": "adapt_bday_outdoor_weather",
                "text": "Confirm shade canopies, lawn mosquito repellent treatment, and power extension cables.",
                "item_type": "verify",
                "stage": "confirm",
                "what_to_ask": ["Will shaded seating or gazebos be erected if daytime temperature rises?"],
                "what_to_verify": ["Check that all outdoor electrical connections are elevated and covered."]
            }
        ]
    },
    "community": {
        "Venue, Permits & Security": [
            {
                "id": "adapt_comm_outdoor_tents",
                "text": "Verify heavy-duty waterproof shamiana, ground drainage trenches, and fire exit clear zones.",
                "item_type": "verify",
                "stage": "book",
                "what_to_ask": ["Are emergency vehicle pathways kept unobstructed by outdoor tent poles?"],
                "what_to_verify": ["Ensure fire brigade NOC if shamiana spans over 500 square meters."]
            }
        ]
    }
}

DIETARY_CHECKLIST_ADDITIONS: Dict[str, Dict[str, List[Dict[str, Any]]]] = {
    "jain": {
        "wedding": {
            "Catering & Hospitality": [
                {
                    "id": "adapt_jain_wedding",
                    "text": "Confirm strict Jain catering protocol: rootless vegetables (no onion, garlic, potato) and dedicated cookware.",
                    "item_type": "verify",
                    "stage": "confirm",
                    "what_to_ask": ["Are dedicated kitchen utensils used exclusively for pure Jain food preparation?"],
                    "what_to_verify": ["Verify early dining timing arrangements for guests observing Chauvihar (before sunset)."]
                }
            ]
        },
        "birthday": {
            "Food & Beverages": [
                {
                    "id": "adapt_jain_birthday",
                    "text": "Confirm eggless, gelatin-free birthday cake and labeled Jain snack counters.",
                    "item_type": "verify",
                    "stage": "confirm",
                    "what_to_ask": ["Is the birthday cake certified 100% eggless with vegetarian emulsifiers?"],
                    "what_to_verify": ["Ensure clear bilingual signage at live snack counters indicating Jain options."]
                }
            ]
        },
        "community": {
            "Food, Prasadam & Water": [
                {
                    "id": "adapt_jain_community",
                    "text": "Verify pure sattvic / Jain prasadam preparation using unadulterated ingredients.",
                    "item_type": "verify",
                    "stage": "confirm",
                    "what_to_ask": ["Are all prasadam sweets prepared with pure desi ghee free from synthetic additives?"],
                    "what_to_verify": ["Inspect packaging area hygiene for holy food distribution."]
                }
            ]
        }
    },
    "vegan": {
        "wedding": {
            "Catering & Hospitality": [
                {
                    "id": "adapt_vegan_wedding",
                    "text": "Confirm dairy-free substitutes (tofu/soya chaap instead of paneer, coconut milk sweets).",
                    "item_type": "verify",
                    "stage": "confirm",
                    "what_to_ask": ["Are dairy ghee and cream strictly omitted from designated vegan curries?"],
                    "what_to_verify": ["Verify distinct buffet label cards for vegan attendees."]
                }
            ]
        }
    }
}

LARGE_GATHERING_CHECKLIST_ADDITION = {
    "id": "adapt_crowd_safety_large",
    "text": "Deploy dedicated crowd marshals, separate entrance/exit barricades, and ambulance on standby.",
    "item_type": "verify",
    "stage": "confirm",
    "what_to_ask": ["What is the crowd evacuation and medical emergency response plan for 300+ attendees?"],
    "what_to_verify": ["Verify presence of marked emergency assembly points and working megaphone."]
}
