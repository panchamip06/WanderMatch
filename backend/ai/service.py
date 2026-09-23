"""
ConsensusService — orchestrates the AI common-ground workflow.

Design §7 (AI Approach):
  Blended common-ground generator: produces ONE candidate, validated by
  HardConstraintValidator; regenerates once on failure; then surfaces for
  admin/group review.

  Branch-trigger classifier: classifies whether remaining objections are fixed
  (→ branch) or still reconcilable (→ keep_blending).

LLM backend:
  Reads LLM_API_KEY and LLM_BASE_URL from settings.
  When LLM_API_KEY is empty (dev/CI), a deterministic mock synthesises a
  candidate from the No-reason text — tests pass without a real key.
"""
import json
import logging
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger("wandermatch.ai")


def _mock_candidate(
    slot_data: Dict[str, Any],
    no_reasons: List[str],
    voter_ids: List[str],
) -> Dict[str, Any]:
    """
    Deterministic mock: build a candidate from the slot data + No-reason text.
    Used in dev/CI when LLM_API_KEY is not set.
    """
    original_title = slot_data.get("title", "Activity")
    original_cost = slot_data.get("cost", "0.00")
    original_currency = slot_data.get("currency", "INR")
    original_duration = int(slot_data.get("duration_minutes", 120))

    # Synthesise adjustments from reason text (first 80 chars each, stripped)
    adjustments = [f"Addressed: {r[:80].strip()}" for r in no_reasons if r]
    if not adjustments:
        adjustments = ["Balanced to accommodate group preferences"]

    return {
        "title": f"Blended: {original_title} (adjusted)",
        "rationale": (
            "AI common-ground candidate synthesised from member objections. "
            "Adjustments made to accommodate stated preferences without branching."
        ),
        "cost_delta": "0.00",
        "currency": original_currency,
        "duration_minutes": min(max(original_duration, 30), 720),
        "adjustments": adjustments,
        "accommodated_users": voter_ids,
    }


def _mock_branch_trigger(candidate: Dict[str, Any], no_reasons: List[str]) -> Dict[str, Any]:
    """Deterministic branch-trigger mock: keep_blending unless > 1 incompatible reason."""
    action = "branch" if len(no_reasons) >= 2 else "keep_blending"
    suggested = []
    if action == "branch":
        for i, r in enumerate(no_reasons[:3], start=1):
            suggested.append(f"Branch {i}: {r[:60].strip()}")
    return {
        "action": action,
        "reason": (
            "More than 2 distinct incompatible objections detected; branching recommended."
            if action == "branch"
            else "Objections appear reconcilable; further blending recommended."
        ),
        "suggested_branches": suggested,
    }


class ConsensusService:
    """
    Orchestrates the AI consensus pipeline:
      1. generate_candidate  — build prompt → call LLM (or mock) → parse JSON
      2. validate_candidate  — delegate to HardConstraintValidator
      3. classify_branch_trigger — determine keep_blending vs branch
    """

    def __init__(self) -> None:
        from backend.app.core.config import settings
        self._api_key: str = settings.LLM_API_KEY or ""
        self._model: str = settings.LLM_MODEL
        self._base_url: str = settings.LLM_BASE_URL
        self._use_mock: bool = not bool(self._api_key)
        if self._use_mock:
            logger.info(
                "ConsensusService: LLM_API_KEY not set — using deterministic mock "
                "(set LLM_API_KEY in .env to enable live Gemini calls)"
            )

    # ------------------------------------------------------------------
    # LLM helpers
    # ------------------------------------------------------------------

    async def _call_llm(self, system_prompt: str, user_message: str) -> str:
        """POST to Gemini generateContent and return the text response."""
        import httpx

        url = f"{self._base_url}/models/{self._model}:generateContent?key={self._api_key}"
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_message}]}],
            "generationConfig": {"responseMimeType": "application/json"},
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
        # Extract text from Gemini response envelope
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(f"Unexpected LLM response structure: {data}") from exc

    @staticmethod
    def _parse_json(raw: str) -> Dict[str, Any]:
        """Strip markdown fences and parse JSON."""
        text = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()
        return json.loads(text)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def generate_candidate(
        self,
        slot_data: Dict[str, Any],
        proposals: List[Dict[str, Any]],
        no_reasons: List[str],
        voter_ids: List[str],
    ) -> Dict[str, Any]:
        """
        Generate a blended common-ground candidate.

        Returns a dict matching the COMMON_GROUND prompt output schema.
        Falls back to mock when LLM_API_KEY is absent.
        """
        from backend.ai.prompts.consensus import (
            COMMON_GROUND_SYSTEM_PROMPT,
            COMMON_GROUND_USER_TEMPLATE,
        )

        if self._use_mock:
            return _mock_candidate(slot_data, no_reasons, voter_ids)

        user_msg = COMMON_GROUND_USER_TEMPLATE.format(
            title=slot_data.get("title", ""),
            cost=slot_data.get("cost", "0.00"),
            currency=slot_data.get("currency", "INR"),
            duration_minutes=slot_data.get("duration_minutes", 120),
            proposals_json=json.dumps(proposals, ensure_ascii=False),
            no_reasons_json=json.dumps(no_reasons, ensure_ascii=False),
            voter_ids_json=json.dumps(voter_ids, ensure_ascii=False),
        )

        try:
            raw = await self._call_llm(COMMON_GROUND_SYSTEM_PROMPT, user_msg)
            candidate = self._parse_json(raw)
        except Exception as exc:
            logger.warning("LLM call failed (%s); falling back to mock candidate", exc)
            return _mock_candidate(slot_data, no_reasons, voter_ids)

        # Normalise: ensure required keys present
        candidate.setdefault("currency", slot_data.get("currency", "INR"))
        candidate.setdefault("duration_minutes", slot_data.get("duration_minutes", 120))
        candidate.setdefault("adjustments", [])
        candidate.setdefault("accommodated_users", voter_ids)
        return candidate

    async def validate_candidate(
        self,
        slot_data: Dict[str, Any],
        candidate: Dict[str, Any],
    ) -> tuple[bool, str]:
        """Delegate to HardConstraintValidator.validate_proposal."""
        from backend.ai.validators.constraints import HardConstraintValidator
        return HardConstraintValidator.validate_proposal(slot_data, candidate)

    async def classify_branch_trigger(
        self,
        candidate: Dict[str, Any],
        no_reasons: List[str],
    ) -> Dict[str, Any]:
        """
        Classify whether to keep blending or branch.

        Returns dict with keys: action, reason, suggested_branches.
        Falls back to mock when LLM_API_KEY is absent.
        """
        from backend.ai.prompts.consensus import BRANCH_TRIGGER_PROMPT

        if self._use_mock:
            return _mock_branch_trigger(candidate, no_reasons)

        user_msg = json.dumps(
            {
                "candidate": {
                    "title": candidate.get("title", ""),
                    "adjustments": candidate.get("adjustments", []),
                },
                "no_reasons": no_reasons,
            },
            ensure_ascii=False,
        )

        try:
            raw = await self._call_llm(BRANCH_TRIGGER_PROMPT, user_msg)
            result = self._parse_json(raw)
        except Exception as exc:
            logger.warning("Branch-trigger LLM call failed (%s); using mock", exc)
            return _mock_branch_trigger(candidate, no_reasons)

        result.setdefault("suggested_branches", [])
        return result


# Singleton — imported by consensus.py endpoint
consensus_service = ConsensusService()
