from dataclasses import dataclass
from typing import Iterable, Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, Spacer, Table, TableStyle

from .pdf_theme import THEME


@dataclass(frozen=True)
class DigitalSignature:
    label: str
    name: str
    signed_at: str = ""
    role: str = ""
    status: str = "Signed"


def report_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "EduLinkReportTitle",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=21,
            leading=25,
            textColor=THEME.ink,
            alignment=TA_LEFT,
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "EduLinkReportSubtitle",
            parent=base["Normal"],
            fontSize=9,
            leading=13,
            textColor=THEME.muted,
            spaceAfter=8,
        ),
        "section": ParagraphStyle(
            "EduLinkSection",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=THEME.brand_dark,
            spaceBefore=12,
            spaceAfter=8,
        ),
        "label": ParagraphStyle(
            "EduLinkLabel",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=10,
            textColor=THEME.muted,
        ),
        "value": ParagraphStyle(
            "EduLinkValue",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9,
            leading=12,
            textColor=THEME.ink,
        ),
        "body": ParagraphStyle(
            "EduLinkBody",
            parent=base["Normal"],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#374151"),
        ),
        "small": ParagraphStyle(
            "EduLinkSmall",
            parent=base["Normal"],
            fontSize=7.5,
            leading=10,
            textColor=THEME.muted,
        ),
        "center_small": ParagraphStyle(
            "EduLinkCenterSmall",
            parent=base["Normal"],
            fontSize=7.5,
            leading=10,
            alignment=TA_CENTER,
            textColor=THEME.muted,
        ),
    }


def section_label(title: str, styles: dict) -> Table:
    table = Table(
        [[Paragraph(title.upper(), styles["section"])]],
        colWidths=[174 * mm],
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), THEME.brand_soft),
        ("BOX", (0, 0), (-1, -1), 0.5, THEME.brand_border),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def key_value_table(rows: Iterable[tuple[str, str]], styles: dict, col_widths=None) -> Table:
    data = []
    row = []
    for label, value in rows:
        row.extend([Paragraph(label.upper(), styles["label"]), Paragraph(value or "N/A", styles["value"])])
        if len(row) == 4:
            data.append(row)
            row = []
    if row:
        row.extend(["", ""])
        data.append(row)

    table = Table(data, colWidths=col_widths or [33 * mm, 54 * mm, 33 * mm, 54 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), THEME.surface),
        ("BOX", (0, 0), (-1, -1), 0.5, THEME.line),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, THEME.line),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def signature_table(signatures: Iterable[DigitalSignature], styles: dict) -> Table:
    rows = []
    for sig in signatures:
        signed_line = str(sig.name or "Pending")
        meta = " · ".join(str(part) for part in [sig.role, sig.signed_at, sig.status] if part)
        rows.append([
            Paragraph(sig.label.upper(), styles["label"]),
            Paragraph(signed_line, styles["value"]),
            Paragraph(meta or "Digital signature pending", styles["small"]),
        ])

    table = Table(rows, colWidths=[42 * mm, 62 * mm, 70 * mm])
    table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, THEME.line),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, THEME.line),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def review_panel(label: str, text: Optional[str], styles: dict):
    if not text:
        return []
    return [
        Paragraph(f"<b>{label}</b>", styles["label"]),
        Table(
            [[Paragraph(text, styles["body"])]],
            colWidths=[174 * mm],
            style=[
                ("BACKGROUND", (0, 0), (-1, -1), THEME.brand_soft),
                ("BOX", (0, 0), (-1, -1), 0.5, THEME.brand_border),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ],
        ),
        Spacer(1, 5),
    ]
