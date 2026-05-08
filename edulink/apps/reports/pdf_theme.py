from dataclasses import dataclass

from reportlab.lib import colors
from reportlab.lib.units import mm


@dataclass(frozen=True)
class ReportTheme:
    brand: colors.Color = colors.HexColor("#1ab8aa")
    brand_dark: colors.Color = colors.HexColor("#0f766e")
    brand_soft: colors.Color = colors.HexColor("#f0fdfa")
    brand_border: colors.Color = colors.HexColor("#ccfbf1")
    ink: colors.Color = colors.HexColor("#111827")
    muted: colors.Color = colors.HexColor("#6b7280")
    faint: colors.Color = colors.HexColor("#9ca3af")
    line: colors.Color = colors.HexColor("#e5e7eb")
    surface: colors.Color = colors.HexColor("#f9fafb")
    white: colors.Color = colors.white
    danger: colors.Color = colors.HexColor("#dc2626")
    warning: colors.Color = colors.HexColor("#d97706")


THEME = ReportTheme()
PAGE_MARGIN = 18 * mm
SMALL_RADIUS = 4

