"""Vendor and regulatory compliance checklist generator."""

from app.models import EventInput, VendorChecklist


def generate_checklist(event: EventInput) -> VendorChecklist:
    """Generate vendor questions and verification checks per event type.

    Placeholder for Step 3.
    """
    raise NotImplementedError("Checklist generation will be implemented in Step 3.")
