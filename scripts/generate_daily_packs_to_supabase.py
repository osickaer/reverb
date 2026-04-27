#!/usr/bin/env python3
"""Generate Reverb daily packs from the centralized Supabase question bank.

Usage:
  python scripts/generate_daily_packs_to_supabase.py
  python scripts/generate_daily_packs_to_supabase.py --output-json daily_packs.json
  python scripts/generate_daily_packs_to_supabase.py --execute

Required for --execute:
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

For dry runs, the script can read questions with either SUPABASE_SERVICE_ROLE_KEY
or EXPO_PUBLIC_SUPABASE_KEY. The script reads SUPABASE_URL or
EXPO_PUBLIC_SUPABASE_URL for the project URL.

The service role key should stay local/server-side only. Do not expose it in
Expo public env vars or commit it to the repo.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import random
import sys
import uuid
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[1]
PACK_SIZE = 5
PACK_DIFFICULTIES = ("easy", "medium", "medium", "hard", "hard")
PACK_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "reverb:daily_packs")
DEFAULT_MIN_REPEAT_GAP_DAYS = 7


class DailyPackError(RuntimeError):
    pass


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def get_supabase_url() -> str:
    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
    if not supabase_url:
        raise DailyPackError("Missing SUPABASE_URL. You can set it in .env.local or in your shell.")
    return supabase_url.rstrip("/")


def get_read_key() -> str:
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("EXPO_PUBLIC_SUPABASE_KEY")
    )
    if not key:
        raise DailyPackError(
            "Missing Supabase API key. Set SUPABASE_SERVICE_ROLE_KEY or "
            "EXPO_PUBLIC_SUPABASE_KEY before running."
        )
    return key


def get_service_key() -> str:
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not service_key:
        raise DailyPackError(
            "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local locally or set it "
            "in your shell before running with --execute."
        )
    return service_key


def request_json(
    url: str,
    key: str,
    method: str = "GET",
    rows: list[dict[str, Any]] | None = None,
    prefer: str | None = None,
) -> Any:
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }
    data = None

    if rows is not None:
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = prefer or "resolution=merge-duplicates,missing=default,return=minimal"
        data = json.dumps(rows).encode("utf-8")
    elif prefer:
        headers["Prefer"] = prefer

    request = Request(url, data=data, headers=headers, method=method)

    try:
        with urlopen(request, timeout=60) as response:
            body = response.read().decode("utf-8", errors="replace")
            if not body:
                return None
            return json.loads(body)
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise DailyPackError(f"Supabase request failed: HTTP {exc.code}\n{body}") from exc
    except URLError as exc:
        raise DailyPackError(f"Supabase request failed: {exc.reason}") from exc
    except json.JSONDecodeError as exc:
        raise DailyPackError("Supabase returned invalid JSON.") from exc


def fetch_active_questions(supabase_url: str, key: str) -> list[dict[str, Any]]:
    query = urlencode(
        {
            "select": "id,domain,difficulty",
            "status": "eq.active",
            "order": "id.asc",
            "limit": "10000",
        }
    )
    rows = request_json(f"{supabase_url}/rest/v1/questions?{query}", key)
    if not isinstance(rows, list):
        raise DailyPackError("Expected Supabase to return a question list.")

    questions: list[dict[str, Any]] = []
    for row in rows:
        question_id = row.get("id")
        domain = row.get("domain")
        difficulty = row.get("difficulty")
        if not isinstance(question_id, str) or not question_id:
            raise DailyPackError("Question row is missing id.")
        if not isinstance(domain, str) or not domain:
            raise DailyPackError(f"{question_id}: question row is missing domain.")
        if difficulty not in PACK_DIFFICULTIES:
            continue
        questions.append({"id": question_id, "domain": domain, "difficulty": difficulty})

    return questions


def validate_question_pool(questions: list[dict[str, Any]]) -> None:
    by_difficulty = Counter(question["difficulty"] for question in questions)
    missing = [difficulty for difficulty in set(PACK_DIFFICULTIES) if by_difficulty[difficulty] == 0]
    if missing:
        raise DailyPackError(f"Question bank has no active questions for: {', '.join(sorted(missing))}")


def stable_pack_id(day: dt.date) -> str:
    return str(uuid.uuid5(PACK_NAMESPACE, f"daily_pack:{day.isoformat()}"))


def stable_pack_question_id(daily_pack_id: str, position: int) -> str:
    return str(uuid.uuid5(PACK_NAMESPACE, f"daily_pack_question:{daily_pack_id}:{position}"))


def windows_safe_pack_title(day: dt.date) -> str:
    return f"Daily Knowledge Pack - {day.strftime('%b')} {day.day}, {day.year}"


def choose_question(
    candidates: list[dict[str, Any]],
    pack_domains: Counter[str],
    domain_usage: Counter[str],
    question_usage: Counter[str],
    rng: random.Random,
) -> dict[str, Any]:
    if not candidates:
        raise DailyPackError("No candidate questions available for slot.")

    domains = sorted({candidate["domain"] for candidate in candidates})
    domain_scores = []
    for domain in domains:
        same_pack_penalty = pack_domains[domain] * 100
        over_two_penalty = 1000 if pack_domains[domain] >= 2 else 0
        domain_scores.append(
            (
                over_two_penalty + same_pack_penalty + domain_usage[domain],
                rng.random(),
                domain,
            )
        )

    _, _, selected_domain = min(domain_scores)
    domain_candidates = [candidate for candidate in candidates if candidate["domain"] == selected_domain]

    return min(
        domain_candidates,
        key=lambda candidate: (question_usage[candidate["id"]], rng.random(), candidate["id"]),
    )


def generate_daily_packs(
    questions: list[dict[str, Any]],
    start_date: dt.date,
    days: int,
    seed: str,
    min_repeat_gap_days: int,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    validate_question_pool(questions)

    rng = random.Random(seed)
    by_difficulty: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for question in questions:
        by_difficulty[question["difficulty"]].append(question)

    domain_usage: Counter[str] = Counter()
    question_usage: Counter[str] = Counter()
    last_used_day: dict[str, int] = {}
    daily_packs: list[dict[str, Any]] = []
    pack_questions: list[dict[str, Any]] = []

    for offset in range(days):
        day = start_date + dt.timedelta(days=offset)
        daily_pack_id = stable_pack_id(day)
        pack_domains: Counter[str] = Counter()
        selected_question_ids: set[str] = set()

        daily_packs.append(
            {
                "id": daily_pack_id,
                "day_key": day.isoformat(),
                "title": windows_safe_pack_title(day),
            }
        )

        for zero_index, difficulty in enumerate(PACK_DIFFICULTIES):
            position = zero_index + 1
            base_candidates = [
                question
                for question in by_difficulty[difficulty]
                if question["id"] not in selected_question_ids
            ]
            cooled_candidates = [
                question
                for question in base_candidates
                if question["id"] not in last_used_day
                or offset - last_used_day[question["id"]] >= min_repeat_gap_days
            ]
            candidates = cooled_candidates or base_candidates

            selected = choose_question(candidates, pack_domains, domain_usage, question_usage, rng)
            selected_question_ids.add(selected["id"])
            pack_domains[selected["domain"]] += 1
            domain_usage[selected["domain"]] += 1
            question_usage[selected["id"]] += 1
            last_used_day[selected["id"]] = offset

            pack_questions.append(
                {
                    "id": stable_pack_question_id(daily_pack_id, position),
                    "daily_pack_id": daily_pack_id,
                    "question_id": selected["id"],
                    "position": position,
                }
            )

    return daily_packs, pack_questions


def summarize_generation(questions: list[dict[str, Any]], pack_questions: list[dict[str, Any]]) -> None:
    questions_by_id = {question["id"]: question for question in questions}
    difficulty_counts: Counter[str] = Counter()
    domain_counts: Counter[str] = Counter()
    max_same_domain_in_pack = 0
    last_seen_pack_index: dict[str, int] = {}
    min_repeat_gap: int | None = None

    for index in range(0, len(pack_questions), PACK_SIZE):
        pack_rows = pack_questions[index : index + PACK_SIZE]
        pack_index = index // PACK_SIZE
        pack_domain_counts: Counter[str] = Counter()
        for row in pack_rows:
            question = questions_by_id[row["question_id"]]
            difficulty_counts[question["difficulty"]] += 1
            domain_counts[question["domain"]] += 1
            pack_domain_counts[question["domain"]] += 1
            question_id = row["question_id"]
            if question_id in last_seen_pack_index:
                gap = pack_index - last_seen_pack_index[question_id]
                min_repeat_gap = gap if min_repeat_gap is None else min(min_repeat_gap, gap)
            last_seen_pack_index[question_id] = pack_index

        if pack_domain_counts:
            max_same_domain_in_pack = max(max_same_domain_in_pack, max(pack_domain_counts.values()))

    difficulty_summary = ", ".join(
        f"{difficulty}={difficulty_counts[difficulty]}" for difficulty in sorted(difficulty_counts)
    )
    domain_summary = ", ".join(f"{domain}={domain_counts[domain]}" for domain in sorted(domain_counts))
    print(f"Difficulty distribution: {difficulty_summary}")
    print(f"Domain distribution: {domain_summary}")
    print(f"Max same-domain questions in one pack: {max_same_domain_in_pack}/{PACK_SIZE}")
    if min_repeat_gap is None:
        print("Question repeats: none")
    else:
        print(f"Closest question repeat: {min_repeat_gap} days apart")


def chunks(rows: list[dict[str, Any]], size: int) -> list[list[dict[str, Any]]]:
    return [rows[index : index + size] for index in range(0, len(rows), size)]


def upsert_rows(
    supabase_url: str,
    service_key: str,
    table: str,
    rows: list[dict[str, Any]],
    on_conflict: str,
    batch_size: int,
) -> None:
    endpoint = f"{supabase_url}/rest/v1/{table}?{urlencode({'on_conflict': on_conflict})}"

    for batch_index, batch in enumerate(chunks(rows, batch_size), start=1):
        request_json(endpoint, service_key, method="POST", rows=batch)
        print(f"Upserted {table} batch {batch_index}: {len(batch)} rows")


def delete_existing_pack_questions(
    supabase_url: str,
    service_key: str,
    daily_pack_ids: list[str],
) -> None:
    if not daily_pack_ids:
        return

    encoded_ids = ",".join(daily_pack_ids)
    endpoint = f"{supabase_url}/rest/v1/daily_pack_questions?daily_pack_id=in.({encoded_ids})"
    request_json(endpoint, service_key, method="DELETE", prefer="return=minimal")
    print(f"Deleted existing daily_pack_questions rows for {len(daily_pack_ids)} generated packs")


def parse_date(value: str) -> dt.date:
    try:
        return dt.date.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("Date must use YYYY-MM-DD format.") from exc


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate shared daily question packs and upsert them to Supabase."
    )
    parser.add_argument(
        "--start-date",
        type=parse_date,
        default=dt.date.today(),
        help="First day_key to generate, in YYYY-MM-DD format. Defaults to today.",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=31,
        help="Number of daily packs to generate. Defaults to 31: today plus the next 30 days.",
    )
    parser.add_argument(
        "--seed",
        default="reverb-daily-packs-v1",
        help="Random seed. Keep stable for reproducible packs.",
    )
    parser.add_argument(
        "--min-repeat-gap-days",
        type=int,
        default=DEFAULT_MIN_REPEAT_GAP_DAYS,
        help=(
            "Minimum days before reusing the same question when alternatives exist. "
            f"Defaults to {DEFAULT_MIN_REPEAT_GAP_DAYS}."
        ),
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Rows per Supabase REST upsert request.",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        help="Optional path to write generated packs as JSON.",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually upsert rows into Supabase. Without this, the script only validates.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.days < 1:
        raise DailyPackError("--days must be at least 1.")
    if args.batch_size < 1:
        raise DailyPackError("--batch-size must be at least 1.")
    if args.min_repeat_gap_days < 1:
        raise DailyPackError("--min-repeat-gap-days must be at least 1.")

    load_dotenv(REPO_ROOT / ".env.local")
    load_dotenv(REPO_ROOT / ".env")

    supabase_url = get_supabase_url()
    read_key = get_read_key()
    questions = fetch_active_questions(supabase_url, read_key)
    daily_packs, pack_questions = generate_daily_packs(
        questions=questions,
        start_date=args.start_date,
        days=args.days,
        seed=args.seed,
        min_repeat_gap_days=args.min_repeat_gap_days,
    )

    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(
            json.dumps(
                {"daily_packs": daily_packs, "daily_pack_questions": pack_questions},
                indent=2,
                ensure_ascii=False,
            )
            + "\n",
            encoding="utf-8",
        )
        print(f"Wrote generated JSON to {args.output_json}")

    print(
        f"Generated {len(daily_packs)} daily packs and {len(pack_questions)} "
        f"pack-question rows from {len(questions)} active questions."
    )
    summarize_generation(questions, pack_questions)

    if not args.execute:
        print("Dry run only. Run again with --execute to upsert into Supabase.")
        return 0

    service_key = get_service_key()
    upsert_rows(supabase_url, service_key, "daily_packs", daily_packs, "day_key", args.batch_size)
    delete_existing_pack_questions(
        supabase_url,
        service_key,
        [daily_pack["id"] for daily_pack in daily_packs],
    )
    upsert_rows(
        supabase_url,
        service_key,
        "daily_pack_questions",
        pack_questions,
        "daily_pack_id,position",
        args.batch_size,
    )
    print(
        f"Done. Upserted {len(daily_packs)} rows into public.daily_packs and "
        f"{len(pack_questions)} rows into public.daily_pack_questions."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except DailyPackError as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
