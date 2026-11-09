"""Loot and streak rules. Each test guards a way the game could cheat you or rob you."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import loot  # noqa: E402

CFG = json.loads((ROOT / "skills.json").read_text())


def skill(sid, xp, level=1):
    return {"id": sid, "name": sid, "xp": xp, "level": level}


NO_STREAK = {"days": 0, "start": None}


def first_with(ledger, kind=None, rarity=None):
    for cid, c in ledger["chests"].items():
        d = loot.contents(CFG, cid, c["tier"])["drop"]
        if (kind is None or d["kind"] == kind) and (rarity is None or d["rarity"] == rarity):
            return cid, d
    return None, None


class LootTest(unittest.TestCase):
    def big_ledger(self):
        ledger = {}
        loot.earn(CFG, ledger, [skill("prompting", 2_000_000)], NO_STREAK, now=1)
        return ledger

    def test_chests_never_reroll(self):
        a, b = {}, {}
        loot.earn(CFG, a, [skill("prompting", 50_000)], NO_STREAK, now=1)
        loot.earn(CFG, b, [skill("prompting", 50_000)], NO_STREAK, now=2)
        self.assertEqual(a["chests"].keys(), b["chests"].keys())
        for cid, c in a["chests"].items():
            self.assertEqual(loot.contents(CFG, cid, c["tier"]), loot.contents(CFG, cid, b["chests"][cid]["tier"]))
        before = dict(a["chests"])
        loot.earn(CFG, a, [skill("prompting", 10_000)], NO_STREAK, now=3)  # XP shrank after a rescan
        loot.earn(CFG, a, [skill("prompting", 50_000)], NO_STREAK, now=4)  # and came back
        self.assertEqual(a["chests"], before)  # no new rolls for chunks already rolled

    def test_every_rarity_and_kind_can_actually_drop(self):
        ledger = self.big_ledger()
        seen = {(loot.contents(CFG, cid, c["tier"])["drop"]["rarity"]) for cid, c in ledger["chests"].items()}
        self.assertEqual(seen, {"common", "rare", "ultra", "extraordinary"})

    def test_a_chest_opens_once_and_gold_cannot_be_spent_twice(self):
        ledger = self.big_ledger()
        cid, d = first_with(ledger, kind="gold")
        got = loot.contents(CFG, cid, ledger["chests"][cid]["tier"])
        gold = d["amount"] + got["bonus_gold"]
        inv = loot.inventory(CFG, ledger, [{"action": "open", "chest": cid}] * 3, now=0)
        self.assertEqual(inv["gold"], gold)
        cheapest = min(loot.shop(CFG), key=lambda r: r["cost"])
        n = gold // cheapest["cost"]
        inv = loot.inventory(CFG, ledger, [{"action": "open", "chest": cid}]
                             + [{"action": "redeem", "reward": cheapest["id"]}] * (n + 3), now=0)
        self.assertEqual(len(inv["redeemed"]), n)  # the extra redeems are refused, never negative gold
        self.assertGreaterEqual(inv["gold"], 0)

    def test_coins_buy_chests_not_permissions_and_never_go_negative(self):
        sold = {r["id"] for r in loot.shop(CFG) if r["id"].startswith("v_")}
        self.assertEqual(sold, {d["id"] for d in CFG["loot"]["drops"] if "price" in d})  # only treats you priced
        wooden = next(r for r in loot.shop(CFG) if r.get("tier") == "wooden")
        acts = [{"action": "redeem", "reward": wooden["id"], "t": 10 + i} for i in range(5)]
        inv = loot.inventory(CFG, {}, acts, now=0, earned_coins=wooden["cost"] * 2 + 1)
        self.assertEqual((len(inv["unopened"]), inv["gold"]), (2, 1))
        bought = inv["unopened"][0]["id"]
        again = loot.inventory(CFG, {}, acts + [{"action": "open", "chest": bought}], now=0, earned_coins=wooden["cost"] * 2 + 1)
        self.assertEqual(again["opened"], [bought])  # a bought chest opens, once, with fixed contents

    def test_vouchers_and_potions_are_used_up(self):
        ledger = self.big_ledger()
        vid_chest, v = first_with(ledger, kind="voucher")
        pot_chest, p = next((c, d) for c, d in (first_with(ledger, kind="item", rarity=r) for r in ("common", "rare"))
                            if d and d["id"] in CFG["loot"]["boosts"])
        acts = [{"action": "open", "chest": vid_chest}, {"action": "claim", "voucher": v["id"]},
                {"action": "claim", "voucher": v["id"]},
                {"action": "open", "chest": pot_chest}, {"action": "use", "item": p["id"], "t": 100},
                {"action": "use", "item": p["id"], "t": 200}]
        inv = loot.inventory(CFG, ledger, acts, now=150)
        self.assertEqual(len(inv["redeemed"]), 1)
        self.assertEqual(len(inv["boosts"]), 1)
        self.assertEqual(inv["boost_active"][0], 100)

    def test_level_ups_always_give_chests_from_the_threshold_and_a_third_of_the_time_below(self):
        def chests(levels):
            ledger = {}
            for lv in levels:
                loot.earn(CFG, ledger, [skill(f"s{i}", 0, lv[i]) for i in range(len(lv))], NO_STREAK, now=1)
            return {c for c in ledger["chests"] if c.startswith("levelup-")}
        frm = CFG["loot"]["level_up_chest"]["always_from"]
        got = chests([[12] * 200, [frm + 10] * 200])  # 200 skills climb from 12 to 10 levels past the threshold
        per_level = {lv: sum(f"-{lv}" == c[c.rfind("-"):] for c in got) for lv in range(13, frm + 11)}
        self.assertTrue(all(per_level[lv] == 200 for lv in range(frm, frm + 11) if lv % 10))  # always from the threshold
        self.assertEqual(sum(per_level[lv] for lv in per_level if lv % 10 == 0), 0)  # milestones are not doubled
        below = [lv for lv in range(13, frm) if lv % 10]
        self.assertAlmostEqual(sum(per_level[lv] for lv in below) / (200 * len(below)), 1 / 3, delta=0.05)  # 1 in 3 below
        self.assertEqual(chests([[30] * 5]), set())  # levels you had before the rule give nothing
        self.assertEqual(chests([[12] * 200, [frm + 10] * 200, [3] * 200, [frm + 10] * 200]), got)  # a dip never re-drops

    def test_you_can_only_equip_what_you_own_in_its_own_slot(self):
        ledger = self.big_ledger()
        cid, pet = first_with(ledger, kind="pet")
        inv = loot.inventory(CFG, ledger, [{"action": "equip", "slot": "pet", "id": pet["id"]}], now=0)
        self.assertIsNone(inv["equipped"]["pet"])  # not opened yet
        inv = loot.inventory(CFG, ledger, [{"action": "open", "chest": cid},
                                           {"action": "equip", "slot": "title", "id": pet["id"]},
                                           {"action": "equip", "slot": "pet", "id": pet["id"]}], now=0)
        self.assertEqual((inv["equipped"]["pet"], inv["equipped"]["title"]), (pet["id"], None))

    def test_an_opened_chest_keeps_its_drop_when_the_drop_table_changes(self):
        ledger = self.big_ledger()
        cid, d = first_with(ledger, kind="voucher")
        acts = [{"action": "open", "chest": cid}]
        loot.inventory(CFG, ledger, acts, now=0)
        changed = json.loads(json.dumps(CFG))
        changed["loot"]["drops"] = [x for x in changed["loot"]["drops"] if x["id"] != d["id"]]  # new items, new odds
        inv = loot.inventory(changed, ledger, acts, now=0)
        self.assertEqual(inv["vouchers"].get(d["id"]), 1)

    def test_a_recount_moves_levels_but_pays_no_chests(self):
        ledger = {}
        loot.earn(CFG, ledger, [skill("afk", 1_600, 25)], NO_STREAK, now=1)
        ledger["last_total_xp"], ledger["coins_base_xp"] = 1_600, 0
        before = set(ledger["chests"])
        jumped = [skill("afk", 4_400, 34)]  # the counting got fixed: same work, higher level
        loot.rebase(ledger, jumped, CFG["loot"]["xp_per_chest"])
        loot.earn(CFG, ledger, jumped, NO_STREAK, now=2)
        self.assertEqual(set(ledger["chests"]), before)
        self.assertEqual(ledger["coins_base_xp"], 2_800)  # coins do not jump either
        loot.earn(CFG, ledger, [skill("afk", 4_900, 35)], NO_STREAK, now=3)  # real work after it still pays
        self.assertIn("levelup-afk-35", ledger["chests"])
        del ledger["chests"]["levelup-afk-35"]
        ledger["revoked"] = ["levelup-afk-35"]  # you asked for it to go away
        loot.earn(CFG, ledger, [skill("afk", 4_900, 35)], NO_STREAK, now=4)
        self.assertNotIn("levelup-afk-35", ledger["chests"])

    def test_a_worked_day_ends_with_at_least_two_chests_and_only_once(self):
        day = {"2026-11-09": 100, "2026-11-10": 200, "2026-11-11": 300, "2026-11-12": 400}  # epoch-ish stamps per day
        day_of = lambda t: next(d for d, s in day.items() if s <= t < s + 100)
        ledger = {"floor_from": "2026-11-09", "chests": {
            "meter-1": {"tier": "wooden", "t": 110},                                        # 9th: 1 earned
            "meter-2": {"tier": "wooden", "t": 210}, "meter-3": {"tier": "wooden", "t": 220},  # 10th: 2 earned
            "bought-1": {"tier": "gold", "t": 310}}}                                        # 11th: only bought
        settle = lambda today: loot.daily_floor(CFG, ledger, {"2026-11-09", "2026-11-10", "2026-11-11"}, today,
                                                day_of, lambda d: day[d] + 99)
        settle("2026-11-12")
        per_day = lambda d: len([c for cid, c in ledger["chests"].items() if day_of(c["t"]) == d and not cid.startswith("bought-")])
        self.assertEqual([per_day(d) for d in ("2026-11-09", "2026-11-10", "2026-11-11")], [2, 2, 2])
        ledger["revoked"] = ["meter-2"]
        del ledger["chests"]["meter-2"]  # you asked for a chest from the 10th to go away
        settle("2026-11-13")  # a later run never tops a settled day up again
        self.assertEqual(per_day("2026-11-10"), 1)

    def test_lucky_charms_shrink_the_chest_meter_for_good(self):
        charms = [d for d in CFG["loot"]["drops"] if d["kind"] == "charm"]
        ledger = {"chests": {f"c{i}": {"tier": "wooden", "t": 0} for i in range(len(charms))},
                  "opened_contents": {f"c{i}": {"drop": d, "bonus_gold": 0} for i, d in enumerate(charms)}}
        base = CFG["loot"]["xp_per_chest"]
        inv = loot.inventory(CFG, ledger, [], now=0)
        self.assertEqual(loot.meter_size(CFG, inv), base)
        inv = loot.inventory(CFG, ledger, [{"action": "open", "chest": f"c{i}", "t": 1} for i in range(len(charms))], now=0)
        per = loot.meter_size(CFG, inv)
        self.assertEqual(per, round(base * (1 - sum(d["chest_speed"] for d in charms))))
        earned = {}
        loot.earn(CFG, earned, [skill("afk", 3 * per)], NO_STREAK, now=1, per=per)
        self.assertEqual(len([c for c in earned["chests"] if c.startswith("meter-")]), 3)

    def test_set_bonus_starts_when_the_set_is_done_and_duplicates_do_not_count(self):
        cfg = json.loads(json.dumps(CFG))
        milks = [d for d in cfg["loot"]["drops"] if d["kind"] == "milk"]
        ledger = {"chests": {f"c{i}": {"tier": "wooden", "t": 0} for i in range(5)},
                  "opened_contents": {f"c{i}": {"drop": milks[i], "bonus_gold": 0} for i in range(4)}}
        ledger["opened_contents"]["c4"] = {"drop": milks[0], "bonus_gold": 0}  # a duplicate
        acts = lambda *ids: [{"action": "open", "chest": f"c{i}", "t": 100 * (n + 1)} for n, i in enumerate(ids)]
        inv = loot.inventory(cfg, ledger, acts(0, 4, 1), now=0)  # two different milks: half set at t=300
        self.assertEqual(loot.perk_multiplier(inv["perks"], "wispr", 299), 1)
        self.assertAlmostEqual(loot.perk_multiplier(inv["perks"], "wispr", 300), 1.05)
        self.assertEqual(loot.perk_multiplier(inv["perks"], "afk", 300), 1)
        inv = loot.inventory(cfg, ledger, acts(0, 1, 2, 3) + [{"action": "equip", "slot": "aura", "id": "milk"}], now=0)
        self.assertAlmostEqual(loot.perk_multiplier(inv["perks"], "wispr", 400), 1.10)  # full replaces half
        self.assertEqual(inv["equipped"]["aura"], "milk")


class StreakTest(unittest.TestCase):
    # Mon 2 Nov 2026 .. Sun 15 Nov 2026
    def days(self, *dd):
        return {f"2026-11-{d:02d}" for d in dd}

    def test_one_free_rest_day_per_week_then_shields_then_it_breaks(self):
        ledger = {}
        active = self.days(2, 4, 6, 8, 9, 10, 12)  # gaps: 3, 5, 7 (week 1) and 11 (week 2)
        loot.settle_streak(ledger, active, "2026-11-02", "2026-11-13", shields_held=1)
        cov = ledger["streak"]["covered"]
        self.assertEqual(cov, {"2026-11-03": "rest", "2026-11-05": "shield", "2026-11-11": "rest"})
        s = loot.streak(ledger, active, "2026-11-13")  # 13th not done yet: count up to the 12th
        self.assertEqual((s["days"], s["start"]), (4, "2026-11-08"))  # day 7 broke it: no rest, no shield left

    def test_a_spent_shield_stays_spent(self):
        ledger = {}
        active = self.days(2, 4, 6)
        loot.settle_streak(ledger, active, "2026-11-02", "2026-11-07", shields_held=1)
        loot.settle_streak(ledger, active, "2026-11-02", "2026-11-07", shields_held=1)  # the panel runs every minute
        spent = [d for d, how in ledger["streak"]["covered"].items() if how == "shield"]
        self.assertEqual(spent, ["2026-11-05"])

    def test_today_without_enough_xp_does_not_break_the_streak_yet(self):
        ledger = {}
        active = self.days(2, 3, 4)
        loot.settle_streak(ledger, active, "2026-11-02", "2026-11-05", shields_held=0)
        s = loot.streak(ledger, active, "2026-11-05")
        self.assertEqual((s["days"], s["today_done"]), (3, False))


if __name__ == "__main__":
    unittest.main()


class BuddyTest(unittest.TestCase):
    """Guards the buddy against free food and a strength that ignores how you work."""
    import buddy as B  # noqa: E402

    DAY = 86400

    def day_of(self, t):
        return f"d{int(t // self.DAY)}"

    def test_meals_come_only_from_todays_work_and_are_eaten_once(self):
        totals = {"d1": 2 * self.B.settings(CFG)["xp_per_meal"] + 100}  # 2 meals earned on day 1
        feeds = [{"action": "feed", "t": self.DAY + 3600 * h} for h in (10, 10.1, 10.2, 10.3)]
        st = self.B.state(CFG, feeds, totals, "d1", now=self.DAY + 3600 * 11, start=self.DAY, day_of=self.day_of)
        self.assertEqual(st["meals_left"], 0)
        # start at 80, starve 10 h (62.5 lost), then only the 2 earned meals fill it (+35 each), minus 1 h
        hours = 100 / self.B.settings(CFG)["hunger_hours"]
        self.assertAlmostEqual(st["food"], round(max(0, 80 - 10 * hours) + 2 * 35 - 1 * hours, 1), delta=0.2)

    def test_hunger_and_dirt_never_go_below_zero_and_cleaning_resets_dirt(self):
        st = self.B.state(CFG, [], {}, "d9", now=9 * self.DAY, start=0, day_of=self.day_of)
        self.assertEqual((st["food"], st["clean"]), (0, 0))
        st = self.B.state(CFG, [{"action": "clean", "t": 9 * self.DAY - 1}], {}, "d9", now=9 * self.DAY, start=0,
                          day_of=self.day_of)
        self.assertGreater(st["clean"], 99.9)

    def test_a_poop_pays_one_coin_once_only_after_a_real_meal_and_only_once_it_is_there(self):
        feed_t = self.DAY + 3600 * 10
        totals = {"d1": self.B.settings(CFG)["xp_per_meal"]}  # one meal earned
        due = feed_t + (30 + 60 * self.B.roll(f"poop-{int(feed_t)}")) * 60
        acts = [{"action": "feed", "t": feed_t}, {"action": "feed", "t": feed_t + 60},  # the second has no meal
                {"action": "scoop", "poop": f"poop-{int(feed_t)}", "t": due - 10},       # too early
                {"action": "scoop", "poop": f"poop-{int(feed_t) + 60}", "t": due + 10},  # never eaten
                {"action": "scoop", "poop": "poop-123", "t": due + 10}]                  # made up
        st = self.B.state(CFG, acts, totals, "d1", now=due + 20, start=self.DAY, day_of=self.day_of)
        self.assertEqual((st["scooped"], [p["id"] for p in st["poops"]]), (0, [f"poop-{int(feed_t)}"]))
        acts += [{"action": "scoop", "poop": f"poop-{int(feed_t)}", "t": due + 30}] * 2
        st = self.B.state(CFG, acts, totals, "d1", now=due + 40, start=self.DAY, day_of=self.day_of)
        self.assertEqual((st["scooped"], st["poops"]), (1, []))

    def test_strength_grows_with_work_and_fades_when_you_slack(self):
        b = self.B.settings(CFG)
        work = {f"d{i:02d}": b["day_target_xp"] for i in range(11)}  # today (d10) worked too
        strong = self.B.strength(b, work, "d10")
        self.assertGreater(strong, 90)
        slack = dict(work, **{f"d{i:02d}": 0 for i in range(10, 13)})
        weak = self.B.strength(b, slack, "d13")
        self.assertLess(weak, strong * 0.5)
        half = {f"d{i:02d}": b["day_target_xp"] / 2 for i in range(10)}
        self.assertLess(self.B.strength(b, half, "d10"), strong)
