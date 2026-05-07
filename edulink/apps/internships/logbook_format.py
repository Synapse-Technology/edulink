from datetime import date, datetime, timedelta


ATTACHMENT_LOGBOOK_FORMAT_VERSION = "edulink_attachment_logbook_v1"

ATTACHMENT_WEEKDAYS = [
    {"key": "MON", "label": "Monday", "offset": 0},
    {"key": "TUE", "label": "Tuesday", "offset": 1},
    {"key": "WED", "label": "Wednesday", "offset": 2},
    {"key": "THU", "label": "Thursday", "offset": 3},
    {"key": "FRI", "label": "Friday", "offset": 4},
]


def parse_iso_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def format_iso_date(value: date) -> str:
    return value.isoformat()


def get_week_start_date(value: date) -> date:
    return value - timedelta(days=value.weekday())


def get_required_week_start_dates(start_date: date | None, end_date: date | None) -> list[str]:
    if not start_date or not end_date or end_date < start_date:
        return []

    current = get_week_start_date(start_date)
    final_week = get_week_start_date(end_date)
    required_weeks = []

    while current <= final_week:
        required_weeks.append(format_iso_date(current))
        current += timedelta(days=7)

    return required_weeks


def get_week_ending_date(week_start_date: str) -> str:
    return format_iso_date(parse_iso_date(week_start_date) + timedelta(days=4))


def get_logbook_week_start(metadata: dict | None) -> str:
    normalized = normalize_logbook_metadata(metadata)
    return normalized.get("week_start_date", "")


def build_standard_daily_entries(*, week_start_date: str, entries: dict) -> list[dict]:
    start = parse_iso_date(week_start_date)
    return [
        {
            "day": day["key"],
            "label": day["label"],
            "date": format_iso_date(start + timedelta(days=day["offset"])),
            "description": (entries or {}).get(format_iso_date(start + timedelta(days=day["offset"])), ""),
        }
        for day in ATTACHMENT_WEEKDAYS
    ]


def normalize_logbook_metadata(metadata: dict | None) -> dict:
    metadata = metadata or {}
    week_start_date = metadata.get("week_start_date") or metadata.get("weekStartDate")
    entries = metadata.get("entries") or {}
    daily_entries = metadata.get("daily_entries")

    if not week_start_date and daily_entries:
        week_start_date = daily_entries[0].get("date")

    if not week_start_date:
        return {
            **metadata,
            "format_version": ATTACHMENT_LOGBOOK_FORMAT_VERSION,
            "logbook_type": "INDUSTRIAL_ATTACHMENT",
            "week_start_date": "",
            "week_ending_date": "",
            "weekly_summary": metadata.get("weekly_summary", ""),
            "daily_entries": daily_entries or [],
            "entries": entries,
        }

    if not daily_entries:
        daily_entries = build_standard_daily_entries(
            week_start_date=week_start_date,
            entries=entries,
        )

    return {
        **metadata,
        "format_version": ATTACHMENT_LOGBOOK_FORMAT_VERSION,
        "logbook_type": "INDUSTRIAL_ATTACHMENT",
        "week_start_date": week_start_date,
        "week_ending_date": metadata.get("week_ending_date") or get_week_ending_date(week_start_date),
        "weekly_summary": metadata.get("weekly_summary", ""),
        "daily_entries": daily_entries,
        "entries": entries,
    }
