"""
Hard-Constraint Validator Stub - Sharvani G Bhaskar's Track
Ensures AI-generated itinerary proposals obey logistical validity:
- Timing overlap / sequence check
- Currency consistency
- Daily budget bounds
"""
from typing import Dict, Any, Tuple

class HardConstraintValidator:
    @staticmethod
    def validate_proposal(slot_data: Dict[str, Any], candidate: Dict[str, Any]) -> Tuple[bool, str]:
        """Validate candidate against hard constraints."""
        # 1. Non-empty title
        if not candidate.get("title"):
            return False, "Candidate title cannot be empty"

        # 2. Timing logic check
        duration = candidate.get("duration_minutes", slot_data.get("duration_minutes", 60))
        if duration <= 0 or duration > 720:  # max 12 hours
            return False, f"Invalid activity duration: {duration} minutes"

        return True, "Valid"
