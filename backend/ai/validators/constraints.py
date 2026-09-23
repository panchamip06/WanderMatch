"""
Hard-Constraint Validator — Sharvani G Bhaskar's Track.

Validates AI-generated itinerary candidates against logistical hard constraints
per WanderMatch design §7 (AI Approach):
  - Non-empty title
  - Duration in valid range (30–720 min)
  - Cost delta does not exceed 50% of original slot cost
  - Currency matches the trip/slot currency
  - Round cap: soft-cap at 3 rounds (design §5A Mode NA row 11)
"""
from typing import Dict, Any, Tuple


class HardConstraintValidator:

    MAX_ROUNDS = 3
    MAX_DURATION_MINUTES = 720  # 12 hours
    MIN_DURATION_MINUTES = 30   # half hour
    MAX_COST_OVERRUN_FRACTION = 0.50  # candidate cost delta <= 50% of original cost

    @staticmethod
    def validate_proposal(slot_data: Dict[str, Any], candidate: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Validate an AI-generated candidate against hard constraints.

        Parameters
        ----------
        slot_data : dict
            The original itinerary slot.  Expected keys:
              title, cost (str), currency (ISO-4217), duration_minutes (int).
        candidate : dict
            The AI output.  Expected keys match the COMMON_GROUND prompt schema:
              title, cost_delta (str), currency (ISO-4217), duration_minutes (int).

        Returns
        -------
        (valid: bool, reason: str)
        """
        # 1. Title must be non-empty
        title = (candidate.get("title") or "").strip()
        if not title:
            return False, "Candidate title cannot be empty"

        # 2. Duration must be in valid range
        try:
            duration = int(candidate.get("duration_minutes", slot_data.get("duration_minutes", 60)))
        except (ValueError, TypeError):
            return False, "duration_minutes must be a valid integer"
        if duration < HardConstraintValidator.MIN_DURATION_MINUTES:
            return False, f"Activity duration too short: {duration} min (min {HardConstraintValidator.MIN_DURATION_MINUTES})"
        if duration > HardConstraintValidator.MAX_DURATION_MINUTES:
            return False, f"Activity duration too long: {duration} min (max {HardConstraintValidator.MAX_DURATION_MINUTES})"

        # 3. Cost delta must not add more than 50% of original cost
        try:
            original_cost = abs(float(slot_data.get("cost", "0") or "0"))
            cost_delta = float(candidate.get("cost_delta", "0") or "0")
        except (ValueError, TypeError):
            return False, "cost_delta must be a valid decimal number"
        if original_cost > 0 and cost_delta > original_cost * HardConstraintValidator.MAX_COST_OVERRUN_FRACTION:
            return False, (
                f"Cost delta {cost_delta:.2f} exceeds 50% of original slot cost "
                f"{original_cost:.2f}; candidate is too expensive"
            )

        # 4. Currency must match slot currency (when provided in candidate)
        slot_currency = (slot_data.get("currency") or "").upper()
        candidate_currency = (candidate.get("currency") or "").upper()
        if slot_currency and candidate_currency and candidate_currency != slot_currency:
            return False, (
                f"Currency mismatch: candidate uses '{candidate_currency}', "
                f"slot expects '{slot_currency}'"
            )

        return True, "Valid"

    @staticmethod
    def check_round_cap(current_round: int) -> Tuple[bool, str]:
        """
        Return (allowed, reason).  Blocks when current_round > MAX_ROUNDS.
        """
        if current_round > HardConstraintValidator.MAX_ROUNDS:
            return False, (
                f"Revision cap reached: round {current_round} exceeds the "
                f"{HardConstraintValidator.MAX_ROUNDS}-round soft cap. "
                "Consider branching instead."
            )
        return True, "Round within cap"
