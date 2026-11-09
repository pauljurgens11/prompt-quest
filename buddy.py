"""Your buddy: a little creature you feed and clean, that grows strong when you work.

Strength follows your recent days of work (all skills together). Hunger and cleanliness drop
with time; you feed it with meals you earn by working today, and clean it for free. Everything
is replayed from the panel's action log, so a meal is eaten once and a rescan changes nothing.
"""
import hashlib
from typing import Any, Callable, Dict, List

Cfg = Dict[str, Any]
DEFAULTS: Cfg = {
    "xp_per_meal": 1200,     # one meal per this much XP earned today
    "max_meals": 4,          # meals a day, at most
    "meal": 35,              # hunger a meal fills
    "hunger_hours": 16,      # full to starving
    "clean_hours": 24,       # spotless to filthy
    "day_target_xp": 5000,   # a normal day in all five skills
    "strength_keep": 0.7,    # share of strength left after a day without work
}


def roll(key: str) -> float:
    """Deterministic number in [0, 1) for a key."""
    return int(hashlib.sha1(key.encode()).hexdigest()[:8], 16) / 16 ** 8


def poops(feeds: List[float], actions: List[Dict[str, Any]], now: float) -> Dict[str, Any]:
    """Each meal he really ate comes out once, 30-90 minutes later. Cleaning one up pays a coin,
    once, and only after it is there: a poop is named by its meal, so none can be faked."""
    due = {f"poop-{int(t)}": t + (30 + 60 * roll(f"poop-{int(t)}")) * 60 for t in feeds}
    scooped: List[str] = []
    for a in sorted((a for a in actions if a.get("action") == "scoop"), key=lambda a: a.get("t", 0)):
        pid = a.get("poop")
        if pid in due and pid not in scooped and due[pid] <= a.get("t", 0) <= now:
            scooped.append(pid)
    lying = [{"id": pid, "x": round(8 + 70 * roll(pid + ":x"))} for pid, t in due.items() if t <= now and pid not in scooped]
    return {"poops": lying, "scooped": len(scooped)}


def settings(cfg: Cfg) -> Cfg:
    return {**DEFAULTS, **cfg.get("buddy", {})}


def meals_earned(b: Cfg, day_xp: float) -> int:
    return int(min(b["max_meals"], day_xp // b["xp_per_meal"]))


def strength(b: Cfg, totals: Dict[str, float], today: str) -> float:
    """A rolling score of your recent days: each day keeps strength_keep of yesterday's
    strength and adds what that day's work is worth. Normal days settle near 100. Today
    counts as it grows, but an unfinished morning never drops it more than 10%."""
    gain = 100 * (1 - b["strength_keep"])
    s = 0.0
    for day in sorted(d for d in totals if d < today)[-21:]:
        s = min(100.0, s * b["strength_keep"] + gain * min(1.5, totals[day] / b["day_target_xp"]))
    now = s * b["strength_keep"] + gain * min(1.5, totals.get(today, 0) / b["day_target_xp"])
    return round(min(100.0, max(now, s * 0.9)), 1)


def state(cfg: Cfg, actions: List[Dict[str, Any]], totals: Dict[str, float], today: str, now: float,
          start: float, day_of: Callable[[float], str]) -> Dict[str, Any]:
    """Replay feed and clean clicks since `start`; hunger and dirt grow between them."""
    b = settings(cfg)
    hunger_rate, dirt_rate = 100 / (b["hunger_hours"] * 3600), 100 / (b["clean_hours"] * 3600)
    food, clean, t = 80.0, 80.0, start
    fed: Dict[str, int] = {}
    meals: List[float] = []
    for a in sorted((a for a in actions if a.get("action") in ("feed", "clean")), key=lambda a: a.get("t", 0)):
        at = a.get("t", 0)
        if not start <= at <= now:
            continue
        food, clean, t = max(0.0, food - (at - t) * hunger_rate), max(0.0, clean - (at - t) * dirt_rate), at
        if a["action"] == "clean":
            clean = 100.0
        else:
            day = day_of(at)
            if food < 95 and fed.get(day, 0) < meals_earned(b, totals.get(day, 0)):
                fed[day] = fed.get(day, 0) + 1
                food = min(100.0, food + b["meal"])
                meals.append(at)
    food, clean = max(0.0, food - (now - t) * hunger_rate), max(0.0, clean - (now - t) * dirt_rate)
    earned = meals_earned(b, totals.get(today, 0))
    st = strength(b, totals, today)
    next_meal = None if earned >= b["max_meals"] else int((earned + 1) * b["xp_per_meal"] - totals.get(today, 0))
    return {
        "food": round(food, 1), "clean": round(clean, 1), "strength": st,
        "mood": round((food + clean + st) / 3, 1),
        "meals_left": max(0, earned - fed.get(today, 0)), "meals_today": earned, "max_meals": b["max_meals"],
        "next_meal_xp": next_meal, "meal": b["meal"], "xp_per_meal": b["xp_per_meal"], **poops(meals, actions, now),
    }
