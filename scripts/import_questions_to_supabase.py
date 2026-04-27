#!/usr/bin/env python3
"""Convert Reverb TypeScript question data and upsert it into Supabase.

Usage:
  python scripts/import_questions_to_supabase.py
  python scripts/import_questions_to_supabase.py --output-json questions.json
  python scripts/import_questions_to_supabase.py --execute

Required for --execute:
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

The script reads SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL for the project URL.

The service role key should stay local/server-side only. Do not expose it in
Expo public env vars or commit it to the repo.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_FILES = (
    "geography-questions.ts",
    "history-questions.ts",
    "math-questions.ts",
)
DIFFICULTIES = {"easy", "medium", "hard"}


class ImportErrorWithContext(RuntimeError):
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


def load_questions_from_typescript(files: list[Path]) -> list[dict[str, Any]]:
    for file_path in files:
        if not file_path.exists():
            raise ImportErrorWithContext(f"Missing data file: {file_path}")

    node_script = r"""
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");

const files = JSON.parse(process.argv[1]);

function loadTsModule(file) {
  const source = fs.readFileSync(file, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;

  const module = { exports: {} };
  const dirname = path.dirname(file);

  function localRequire(specifier) {
    if (specifier.endsWith("questions-interface")) {
      return {};
    }
    if (specifier.startsWith(".")) {
      return loadTsModule(path.resolve(dirname, specifier));
    }
    return require(specifier);
  }

  vm.runInNewContext(
    transpiled,
    {
      require: localRequire,
      exports: module.exports,
      module,
      console,
    },
    { filename: file }
  );

  return module.exports;
}

const allQuestions = [];
for (const file of files) {
  const exported = loadTsModule(file);
  for (const value of Object.values(exported)) {
    if (Array.isArray(value)) {
      allQuestions.push(...value);
    }
  }
}

process.stdout.write(JSON.stringify(allQuestions));
"""

    try:
        result = subprocess.run(
            ["node", "-e", node_script, json.dumps([str(path) for path in files])],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError as exc:
        raise ImportErrorWithContext(
            "Node.js is required to evaluate the TypeScript data files."
        ) from exc
    except subprocess.CalledProcessError as exc:
        detail = exc.stderr.strip() or exc.stdout.strip()
        raise ImportErrorWithContext(
            "Failed to load TypeScript data files. Make sure dependencies are "
            f"installed with npm install.\n{detail}"
        ) from exc

    try:
        questions = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise ImportErrorWithContext("TypeScript loader returned invalid JSON.") from exc

    if not isinstance(questions, list):
        raise ImportErrorWithContext("TypeScript loader did not return a question list.")

    return questions


def require_string(question: dict[str, Any], key: str) -> str:
    value = question.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ImportErrorWithContext(f"{question.get('id', '<missing id>')}: {key} is required.")
    return value


def require_string_list(question: dict[str, Any], key: str) -> list[str]:
    value = question.get(key)
    if not isinstance(value, list) or not value:
        raise ImportErrorWithContext(
            f"{question.get('id', '<missing id>')}: {key} must be a non-empty string list."
        )
    if not all(isinstance(item, str) and item.strip() for item in value):
        raise ImportErrorWithContext(
            f"{question.get('id', '<missing id>')}: {key} must contain only strings."
        )
    return value


def optional_string_list(question: dict[str, Any], key: str) -> list[str] | None:
    value = question.get(key)
    if value is None:
        return None
    if not isinstance(value, list):
        raise ImportErrorWithContext(
            f"{question.get('id', '<missing id>')}: {key} must be a string list."
        )
    if not all(isinstance(item, str) and item.strip() for item in value):
        raise ImportErrorWithContext(
            f"{question.get('id', '<missing id>')}: {key} must contain only strings."
        )
    return value


def convert_question(question: dict[str, Any]) -> dict[str, Any]:
    question_id = require_string(question, "id")
    choices = require_string_list(question, "choices")

    difficulty = require_string(question, "difficulty")
    if difficulty not in DIFFICULTIES:
        raise ImportErrorWithContext(f"{question_id}: invalid difficulty {difficulty!r}.")

    correct_index = question.get("correctIndex")
    if not isinstance(correct_index, int):
        raise ImportErrorWithContext(f"{question_id}: correctIndex must be an integer.")
    if correct_index < 0 or correct_index >= len(choices):
        raise ImportErrorWithContext(
            f"{question_id}: correctIndex {correct_index} is outside choices."
        )

    importance = question.get("importance")
    if not isinstance(importance, int) or importance < 1 or importance > 5:
        raise ImportErrorWithContext(f"{question_id}: importance must be an integer from 1 to 5.")

    subdomain = question.get("subdomain")
    if subdomain is not None and not isinstance(subdomain, str):
        raise ImportErrorWithContext(f"{question_id}: subdomain must be a string or null.")

    return {
        "id": question_id,
        "domain": require_string(question, "domain"),
        "subdomain": subdomain,
        "difficulty": difficulty,
        "concept_key": require_string(question, "conceptId"),
        "prompt": require_string(question, "prompt"),
        "choices": choices,
        "correct_index": correct_index,
        "explanation": require_string(question, "explanation"),
        "learn_more_queries": optional_string_list(question, "learnMoreQueries"),
        "tags": optional_string_list(question, "tags"),
        "importance": importance,
        "status": "active",
    }


def convert_questions(questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = [convert_question(question) for question in questions]
    seen: set[str] = set()
    duplicates: set[str] = set()

    for row in rows:
        if row["id"] in seen:
            duplicates.add(row["id"])
        seen.add(row["id"])

    if duplicates:
        duplicate_list = ", ".join(sorted(duplicates))
        raise ImportErrorWithContext(f"Duplicate question ids found: {duplicate_list}")

    return rows


def chunks(rows: list[dict[str, Any]], size: int) -> list[list[dict[str, Any]]]:
    return [rows[index : index + size] for index in range(0, len(rows), size)]


def upsert_rows(rows: list[dict[str, Any]], batch_size: int) -> None:
    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("EXPO_PUBLIC_SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url:
        raise ImportErrorWithContext(
            "Missing SUPABASE_URL. You can set it in .env.local or in your shell."
        )
    if not service_key:
        raise ImportErrorWithContext(
            "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local locally or set it "
            "in your shell before running with --execute."
        )

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/questions?on_conflict=id"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,missing=default,return=minimal",
    }

    for batch_index, batch in enumerate(chunks(rows, batch_size), start=1):
        request = Request(
            endpoint,
            data=json.dumps(batch).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        try:
            with urlopen(request, timeout=60) as response:
                if response.status not in (200, 201, 204):
                    raise ImportErrorWithContext(
                        f"Unexpected response for batch {batch_index}: HTTP {response.status}"
                    )
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise ImportErrorWithContext(
                f"Supabase upsert failed for batch {batch_index}: HTTP {exc.code}\n{body}"
            ) from exc
        except URLError as exc:
            raise ImportErrorWithContext(
                f"Supabase upsert failed for batch {batch_index}: {exc.reason}"
            ) from exc

        print(f"Upserted batch {batch_index}: {len(batch)} rows")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert Reverb question TypeScript files and upsert them to Supabase."
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=REPO_ROOT / "data",
        help="Directory containing the TypeScript question files.",
    )
    parser.add_argument(
        "--file",
        action="append",
        dest="files",
        help="Question file name or path. Can be passed more than once.",
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
        help="Optional path to write converted rows as JSON.",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually upsert rows into Supabase. Without this, the script only validates.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.batch_size < 1:
        raise ImportErrorWithContext("--batch-size must be at least 1.")

    load_dotenv(REPO_ROOT / ".env.local")
    load_dotenv(REPO_ROOT / ".env")

    source_files = args.files or list(DEFAULT_DATA_FILES)
    files = [
        path if path.is_absolute() else args.data_dir / path
        for path in (Path(file_name) for file_name in source_files)
    ]

    questions = load_questions_from_typescript(files)
    rows = convert_questions(questions)

    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(
            json.dumps(rows, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(f"Wrote converted JSON to {args.output_json}")

    print(f"Validated {len(rows)} question rows from {len(files)} files.")

    if not args.execute:
        print("Dry run only. Run again with --execute to upsert into Supabase.")
        return 0

    upsert_rows(rows, args.batch_size)
    print(f"Done. Upserted {len(rows)} rows into public.questions.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ImportErrorWithContext as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
