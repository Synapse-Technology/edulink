import os
from uuid import UUID
from datetime import datetime
from io import BytesIO
from django.conf import settings
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from django.db import transaction
from xhtml2pdf import pisa
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm, inch, pica
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from .models import Artifact, ArtifactType
from edulink.apps.ledger.services import record_event
from edulink.apps.ledger.queries import find_event_by_artifact_id
from edulink.apps.internships.queries import (
    get_application_by_id, 
    get_evidence_for_application,
    get_incidents_for_application,
    get_success_story_for_application
)
from edulink.apps.students.queries import get_student_by_id, get_student_approved_affiliation
from edulink.apps.employers.queries import get_employer_by_id, get_supervisor_by_id
from edulink.apps.institutions.queries import get_institution_by_id, get_institution_staff_by_id
from edulink.apps.notifications.services import (
    send_certificate_generated_notification,
    send_performance_summary_generated_notification,
    send_logbook_report_generated_notification
)

def _render_pdf(template_path, context):
    """
    Internal helper to render a PDF from an HTML template.
    """
    html = render_to_string(template_path, context)
    result = BytesIO()
    pdf = pisa.pisaDocument(BytesIO(html.encode("UTF-8")), result)
    if not pdf.err:
        return result.getvalue()
    return None

def _draw_chess_pattern(c, x, y, size=8, color=colors.HexColor("#1ab8aa")):
    """Draws a 3x3 chess pattern at (x,y)"""
    c.setFillColor(color)
    # Row 1
    c.rect(x, y + size*2, size, size, fill=1, stroke=0)
    c.rect(x + size*2, y + size*2, size, size, fill=1, stroke=0)
    # Row 2
    c.rect(x + size, y + size, size, size, fill=1, stroke=0)
    # Row 3
    c.rect(x, y, size, size, fill=1, stroke=0)
    c.rect(x + size*2, y, size, size, fill=1, stroke=0)

def _generate_certificate_native(context):
    """
    Generates a professional certificate using native ReportLab drawing commands.
    This bypasses HTML/CSS rendering for pixel-perfect, robust results.
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4) # 297mm x 210mm (~841pt x 595pt)
    
    # Colors
    teal = colors.HexColor("#1ab8aa")
    dark_gray = colors.HexColor("#111827")
    gray = colors.HexColor("#4b5563")
    light_gray = colors.HexColor("#9ca3af")
    
    # --- 1. Border ---
    margin = 10 * mm
    c.setStrokeColor(teal)
    c.setLineWidth(5)
    c.rect(margin, margin, width - 2*margin, height - 2*margin)
    
    # --- 2. Patterns ---
    # Top-Left
    _draw_chess_pattern(c, margin + 15, height - margin - 40)
    # Bottom-Right
    _draw_chess_pattern(c, width - margin - 40, margin + 15)
    
    # --- 3. Header ---
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(teal)
    c.drawCentredString(width/2, height - 40*mm, "EDULINK")
    
    c.setFont("Helvetica-Bold", 48)
    c.setFillColor(dark_gray)
    c.drawCentredString(width/2, height - 60*mm, "CERTIFICATE")
    
    c.setFont("Helvetica", 16)
    c.setFillColor(gray)
    c.drawCentredString(width/2, height - 70*mm, "OF PROFESSIONAL INTERNSHIP COMPLETION")
    
    # --- 4. Recipient ---
    c.setFont("Helvetica-Oblique", 14)
    c.setFillColor(gray)
    c.drawCentredString(width/2, height - 85*mm, "This is to officially recognize that")
    
    student_name = context.get("student_name", "Unknown Student")
    c.setFont("Helvetica-Bold", 36)
    c.setFillColor(dark_gray)
    c.drawCentredString(width/2, height - 100*mm, student_name)
    
    # Underline for name
    name_width = c.stringWidth(student_name, "Helvetica-Bold", 36)
    c.setStrokeColor(teal)
    c.setLineWidth(2)
    c.line(width/2 - name_width/2 - 10, height - 103*mm, width/2 + name_width/2 + 10, height - 103*mm)
    
    # --- 5. Achievement Text ---
    position = context.get("position", "Intern")
    employer = context.get("employer_name", "Unknown Employer")
    institution = context.get("institution_name", "Unknown Institution")
    
    c.setFont("Helvetica", 16)
    c.setFillColor(colors.HexColor("#374151"))
    
    # Line 1: has successfully completed...
    text_y = height - 120*mm
    c.drawCentredString(width/2, text_y, f"has successfully completed a professional internship as a")
    
    # Line 2: Position at Employer
    # We construct this line manually to highlight
    line2 = f"{position} at {employer}"
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(teal)
    c.drawCentredString(width/2, text_y - 20, line2)
    
    # Line 3: Facilitated through
    c.setFont("Helvetica", 16)
    c.setFillColor(colors.HexColor("#374151"))
    c.drawCentredString(width/2, text_y - 40, f"facilitated through {institution}.")
    
    # --- 6. Meta Info ---
    start_date = context.get("start_date", "")
    end_date = context.get("end_date", "")
    dept = context.get("department", "")
    
    c.setFont("Helvetica", 11)
    c.setFillColor(gray)
    c.drawCentredString(width/2, text_y - 65, f"Duration: {start_date} — {end_date}   |   Department: {dept}")
    
    # --- 7. Signatures ---
    sig_y = margin + 40*mm
    
    # Employer Sig (Left)
    c.setStrokeColor(dark_gray)
    c.setLineWidth(1)
    c.line(width/2 - 90*mm, sig_y, width/2 - 20*mm, sig_y) # Line
    
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(dark_gray)
    c.drawCentredString(width/2 - 55*mm, sig_y - 15, context.get("employer_supervisor_name", ""))
    
    c.setFont("Helvetica", 9)
    c.setFillColor(gray)
    c.drawCentredString(width/2 - 55*mm, sig_y - 28, "Employer Supervisor")
    c.drawCentredString(width/2 - 55*mm, sig_y - 38, employer)
    
    # Institution Sig (Right)
    c.line(width/2 + 20*mm, sig_y, width/2 + 90*mm, sig_y) # Line
    
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(dark_gray)
    c.drawCentredString(width/2 + 55*mm, sig_y - 15, context.get("institution_supervisor_name", ""))
    
    c.setFont("Helvetica", 9)
    c.setFillColor(gray)
    c.drawCentredString(width/2 + 55*mm, sig_y - 28, "Institution Supervisor")
    c.drawCentredString(width/2 + 55*mm, sig_y - 38, institution)
    
    # --- 8. Footer (Verification) ---
    tracking_code = context.get("tracking_code", "UNKNOWN")
    c.setFont("Courier", 9)
    c.setFillColor(light_gray)
    footer_text = f"Verification URL: edulink.app/verify/{tracking_code}  |  Code: {tracking_code}"
    c.drawCentredString(width/2, margin + 10, footer_text)
    
    c.showPage()
    c.save()
    return buffer.getvalue()

def _generate_performance_summary_native(context):
    """
    Generates a professional Performance Summary using native ReportLab.
    """
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4 # 210mm x 297mm
    
    # Colors
    teal = colors.HexColor("#1ab8aa")
    dark_gray = colors.HexColor("#111827")
    gray = colors.HexColor("#4b5563")
    light_gray = colors.HexColor("#9ca3af")
    bg_gray = colors.HexColor("#f9fafb")
    
    margin = 20 * mm
    content_width = width - 2 * margin
    
    # --- 1. Header ---
    y = height - margin
    
    # Brand
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(teal)
    c.drawString(margin, y - 10, "EDULINK")
    
    # Title & Date
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(dark_gray)
    c.drawRightString(width - margin, y, "PERFORMANCE SUMMARY")
    
    c.setFont("Helvetica", 9)
    c.setFillColor(gray)
    c.drawRightString(width - margin, y - 15, f"Generated: {context.get('generated_at', '')}")
    
    # Divider
    y -= 30
    c.setStrokeColor(teal)
    c.setLineWidth(2)
    c.line(margin, y, width - margin, y)
    
    y -= 40
    
    # --- 2. Engagement Overview ---
    # Section Header
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(dark_gray)
    c.drawString(margin, y, "ENGAGEMENT OVERVIEW")
    c.setStrokeColor(teal)
    c.setLineWidth(1)
    c.line(margin, y - 5, margin + 150, y - 5)
    
    y -= 25
    
    # Data Rows
    labels = ["Student Name", "Placement", "Host Org", "Institution", "Period"]
    keys = ["student_name", "position", "employer_name", "institution_name"]
    # Special handling for period
    
    c.setFont("Helvetica-Bold", 9)
    label_x = margin
    value_x = margin + 100
    row_height = 25
    
    for i, label in enumerate(labels):
        # Label
        c.setFillColor(gray)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(label_x, y, label.upper())
        
        # Value
        c.setFillColor(dark_gray)
        c.setFont("Helvetica-Bold", 11)
        
        if label == "Period":
            val = f"{context.get('start_date')} — {context.get('end_date')}"
        else:
            val = context.get(keys[i], "N/A")
            
        c.drawString(value_x, y, val)
        
        # Grid line
        c.setStrokeColor(colors.HexColor("#f3f4f6"))
        c.setLineWidth(1)
        c.line(margin, y - 8, width - margin, y - 8)
        
        y -= row_height
        
    y -= 20
    
    # --- 3. Metrics Grid ---
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(dark_gray)
    c.drawString(margin, y, "VERIFICATION & IMPACT METRICS")
    c.setStrokeColor(teal)
    c.line(margin, y - 5, margin + 220, y - 5)
    
    y -= 30
    
    # Cards
    card_gap = 10
    card_width = (content_width - (2 * card_gap)) / 3
    card_height = 70
    
    metrics = [
        ("LOGBOOKS VERIFIED", context.get("logbooks_accepted", 0)),
        ("MILESTONES REACHED", context.get("milestones_reached", 0)),
        ("INCIDENTS FLAGGED", context.get("incident_count", 0))
    ]
    
    current_x = margin
    for label, value in metrics:
        # Background
        c.setFillColor(bg_gray)
        # Red highlight for incidents > 0
        is_incident = label == "INCIDENTS FLAGGED" and int(value) > 0
        if is_incident:
             c.setFillColor(colors.HexColor("#fef2f2"))
             c.setStrokeColor(colors.HexColor("#fee2e2"))
        else:
             c.setStrokeColor(colors.HexColor("#e5e7eb"))
             
        c.roundRect(current_x, y - card_height, card_width, card_height, 4, fill=1, stroke=1)
        
        # Value
        c.setFont("Helvetica-Bold", 24)
        if is_incident:
            c.setFillColor(colors.HexColor("#dc2626"))
        else:
            c.setFillColor(teal)
        c.drawCentredString(current_x + card_width/2, y - 35, str(value))
        
        # Label
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(gray)
        c.drawCentredString(current_x + card_width/2, y - 55, label)
        
        current_x += card_width + card_gap
        
    y -= (card_height + 40)
    
    # --- 4. Professional Feedback ---
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(dark_gray)
    c.drawString(margin, y, "PROFESSIONAL FEEDBACK")
    c.setStrokeColor(teal)
    c.line(margin, y - 5, margin + 170, y - 5)
    
    y -= 25
    
    # Feedback Box
    box_height = 150
    c.setFillColor(colors.HexColor("#f0fdfa"))
    c.setStrokeColor(colors.HexColor("#ccfbf1"))
    c.roundRect(margin, y - box_height, content_width, box_height, 8, fill=1, stroke=1)
    
    # Quote Icon
    c.setFont("Helvetica", 60)
    c.setFillColor(teal)
    c.setFillAlpha(0.2)
    c.drawString(margin + 10, y - 50, "“")
    c.setFillAlpha(1)
    
    # Text
    feedback = context.get("final_feedback", "No feedback recorded.")
    c.setFont("Helvetica-Oblique", 12)
    c.setFillColor(colors.HexColor("#134e4a"))
    
    # Simple text wrap
    from reportlab.lib.utils import simpleSplit
    lines = simpleSplit(feedback, "Helvetica-Oblique", 12, content_width - 40)
    
    text_y = y - 40
    for line in lines[:6]: # Limit lines to fit box
        c.drawString(margin + 40, text_y, line)
        text_y -= 18
        
    y -= (box_height + 40)
    
    # --- 5. Footer ---
    # Position at absolute bottom
    footer_y = margin + 30
    
    c.setStrokeColor(colors.HexColor("#e5e7eb"))
    c.setLineWidth(1)
    c.line(margin, footer_y + 20, width - margin, footer_y + 20)
    
    c.setFont("Helvetica", 8)
    c.setFillColor(light_gray)
    c.drawCentredString(width/2, footer_y + 10, "This performance summary is an official Edulink artifact verified by the platform ledger.")
    
    tracking_code = context.get("tracking_code", "UNKNOWN")
    c.drawCentredString(width/2, footer_y, f"Verification Code: {tracking_code}")
    c.drawCentredString(width/2, footer_y - 10, f"Verification URL: edulink.app/verify/{tracking_code}")
    
    c.drawCentredString(width/2, footer_y - 25, f"© {context.get('current_year')} Edulink. All Rights Reserved.")
    
    c.showPage()
    c.save()
    return buffer.getvalue()

def _logbook_header_footer(canvas, doc, context):
    """
    Renders the persistent header and footer for Logbook Reports on every page.
    """
    canvas.saveState()
    width, height = A4
    margin = 20 * mm
    
    # --- Header ---
    # Brand
    canvas.setFont('Helvetica-Bold', 12)
    canvas.setFillColor(colors.HexColor("#1ab8aa"))
    canvas.drawString(margin, height - 15*mm, "EDULINK")
    
    # Meta
    canvas.setFont('Helvetica', 9)
    canvas.setFillColor(colors.HexColor("#9ca3af"))
    text = f"Internship Logbook Report  |  {context.get('generated_at', '')}"
    canvas.drawRightString(width - margin, height - 15*mm, text)
    
    # Divider
    canvas.setStrokeColor(colors.HexColor("#1ab8aa"))
    canvas.setLineWidth(1)
    canvas.line(margin, height - 18*mm, width - margin, height - 18*mm)
    
    # --- Footer ---
    # Divider
    canvas.setStrokeColor(colors.HexColor("#e5e7eb"))
    canvas.setLineWidth(1)
    canvas.line(margin, 20*mm, width - margin, 20*mm)
    
    # Info
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor("#9ca3af"))
    
    tracking_code = context.get('tracking_code', 'UNKNOWN')
    canvas.drawString(margin, 15*mm, f"Verification: {tracking_code}")
    canvas.drawString(margin + 40*mm, 15*mm, f"URL: edulink.app/verify/{tracking_code}")
    
    canvas.drawRightString(width - margin, 15*mm, f"Page {doc.page}")
    
    canvas.restoreState()

def _generate_logbook_report_native(context):
    """
    Generates a multi-page professional Logbook Report using ReportLab Platypus.
    Handles page breaks, tables, and styling robustly.
    """
    buffer = BytesIO()
    
    # Setup Document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20*mm,
        leftMargin=20*mm,
        topMargin=25*mm,
        bottomMargin=25*mm
    )
    
    # Styles
    styles = getSampleStyleSheet()
    
    # Custom Styles
    style_title = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#111827"),
        spaceAfter=20,
        alignment=TA_CENTER
    )
    
    style_section_header = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor("#1ab8aa"),
        spaceBefore=15,
        spaceAfter=10,
        borderPadding=5,
        borderColor=colors.HexColor("#e5e7eb"),
        borderWidth=0,
        borderBottomWidth=1
    )
    
    style_log_title = ParagraphStyle(
        'LogTitle',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=colors.HexColor("#111827"),
        spaceBefore=10,
        spaceAfter=5
    )
    
    style_normal = ParagraphStyle(
        'NormalCustom',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#374151"),
        leading=14
    )
    
    style_label = ParagraphStyle(
        'Label',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor("#6b7280"),
        fontName="Helvetica-Bold"
    )

    style_value = ParagraphStyle(
        'Value',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#111827"),
        fontName="Helvetica-Bold"
    )
    
    elements = []
    
    # 1. Report Title
    elements.append(Paragraph("INTERNSHIP LOGBOOK REPORT", style_title))
    elements.append(Spacer(1, 10))
    
    # 2. Student & Engagement Info (as a Table)
    info_data = [
        [Paragraph("STUDENT", style_label), Paragraph(context.get('student_name', ''), style_value),
         Paragraph("HOST ORG", style_label), Paragraph(context.get('employer_name', ''), style_value)],
        [Paragraph("POSITION", style_label), Paragraph(context.get('position', ''), style_value),
         Paragraph("INSTITUTION", style_label), Paragraph(context.get('institution_name', ''), style_value)],
        [Paragraph("PERIOD", style_label), Paragraph(f"{context.get('start_date', '')} — {context.get('end_date', '')}", style_value),
         Paragraph("LOGBOOKS", style_label), Paragraph(str(len(context.get('logbooks', []))), style_value)]
    ]
    
    info_table = Table(info_data, colWidths=[30*mm, 55*mm, 30*mm, 55*mm])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW', (0,0), (-1,-1), 1, colors.HexColor("#f3f4f6")),
        ('GRID', (0,0), (-1,-1), 0, colors.white), # No grid
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # 3. Iterate Logbooks
    logbooks = context.get('logbooks', [])
    
    if not logbooks:
        elements.append(Paragraph("No accepted logbooks found for this internship.", style_normal))
    
    for i, log in enumerate(logbooks):
        # Keep each logbook block together if possible, or start new page
        # Using KeepTogether for smaller blocks, but logbooks can be long.
        # We will just use logical spacing and flow.
        
        # Logbook Header
        elements.append(Paragraph(f"Logbook #{i+1}: {log.get('title', 'Untitled')}", style_section_header))
        
        # Meta row
        elements.append(Paragraph(f"Submitted: {log.get('submitted_at', 'N/A')}  |  Status: Verified", style_label))
        elements.append(Spacer(1, 5))
        
        # Description
        desc = log.get('description', '')
        if desc:
            elements.append(Paragraph(desc, style_normal))
            elements.append(Spacer(1, 10))
            
        # Daily Entries Table
        entries = log.get('daily_entries', {})
        if entries:
            # Table Data
            table_data = [[Paragraph("DATE", style_label), Paragraph("ACTIVITY & REFLECTION", style_label)]]
            for date_str, activity in entries.items():
                table_data.append([
                    Paragraph(date_str, style_normal),
                    Paragraph(activity, style_normal)
                ])
                
            entry_table = Table(table_data, colWidths=[35*mm, 135*mm])
            entry_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f9fafb")),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e5e7eb")),
            ]))
            elements.append(entry_table)
            elements.append(Spacer(1, 10))
            
        # Reviews
        emp_notes = log.get('employer_notes')
        inst_notes = log.get('institution_notes')
        
        if emp_notes or inst_notes:
            elements.append(Spacer(1, 5))
            
        if emp_notes:
            # Teal Box
            p_text = f"<b>Employer Supervisor Feedback:</b><br/>{emp_notes}"
            p = Paragraph(p_text, ParagraphStyle('EmpReview', parent=style_normal, backColor=colors.HexColor("#f0fdfa"), borderColor=colors.HexColor("#ccfbf1"), borderWidth=1, borderPadding=8, textColor=colors.HexColor("#134e4a")))
            elements.append(p)
            elements.append(Spacer(1, 5))
            
        if inst_notes:
            # Blue Box
            p_text = f"<b>Institution Supervisor Feedback:</b><br/>{inst_notes}"
            p = Paragraph(p_text, ParagraphStyle('InstReview', parent=style_normal, backColor=colors.HexColor("#eff6ff"), borderColor=colors.HexColor("#dbeafe"), borderWidth=1, borderPadding=8, textColor=colors.HexColor("#1e40af")))
            elements.append(p)
            
        elements.append(Spacer(1, 15))
    
    # Build
    # We pass the context to the onPage handler using a lambda or partial if needed, 
    # but since SimpleDocTemplate build accepts onFirstPage and onLaterPages functions
    # that take (canvas, doc), we need to wrap our handler.
    
    def on_page(canvas, doc):
        _logbook_header_footer(canvas, doc, context)
        
    doc.build(elements, onFirstPage=on_page, onLaterPages=on_page)
    
    return buffer.getvalue()

def _generate_tracking_code(artifact_type: str) -> str:
    """
    Generates a unique tracking code for an artifact.
    Format: EDULINK-[TYPE_CHAR]-[RANDOM_ALPHANUM]
    Example: EDULINK-C-XJ92K1
    """
    import string
    import random
    
    prefix = "EDULINK"
    type_char = artifact_type[0].upper()
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    code = f"{prefix}-{type_char}-{random_part}"
    
    # Ensure uniqueness (recursive)
    if Artifact.objects.filter(tracking_code=code).exists():
        return _generate_tracking_code(artifact_type)
        
    return code

def _get_student_institution_info(student_id: UUID) -> str:
    """
    Robustly fetches student's current institution name.
    """
    # 1. Check Student profile
    student = get_student_by_id(str(student_id))
    if student and student.institution_id:
        institution = get_institution_by_id(institution_id=student.institution_id)
        if institution:
            return institution.name
            
    # 2. Check current active affiliations (if any) via query layer
    affiliation = get_student_approved_affiliation(student_id)
    
    if affiliation:
        institution = get_institution_by_id(institution_id=affiliation.institution_id)
        if institution:
            return institution.name
            
    return "N/A"

@transaction.atomic
def generate_completion_certificate(*, application_id: UUID, actor_id: UUID) -> Artifact:
    """
    Generates a professional certificate of completion for a completed internship.
    """
    application = get_application_by_id(application_id)
    if not application:
        raise ValueError("Application not found")
        
    if application.status != "CERTIFIED":
        raise ValueError("Internship must be CERTIFIED by the institution to generate a certificate")

    student = get_student_by_id(str(application.student_id))
    opportunity = application.opportunity
    
    # Fetch employer and institution names
    employer_name = "N/A"
    if opportunity.employer_id:
        employer = get_employer_by_id(opportunity.employer_id)
        employer_name = employer.name if employer else "N/A"
        
    institution_name = _get_student_institution_info(application.student_id)

    # Fetch supervisor names
    employer_supervisor_name = "N/A"
    if application.employer_supervisor_id:
        e_supervisor = get_supervisor_by_id(application.employer_supervisor_id)
        if e_supervisor:
            employer_supervisor_name = f"{e_supervisor.user.first_name} {e_supervisor.user.last_name}"

    institution_supervisor_name = "N/A"
    if application.institution_supervisor_id:
        i_supervisor = get_institution_staff_by_id(staff_id=application.institution_supervisor_id)
        if i_supervisor:
            institution_supervisor_name = f"{i_supervisor.user.first_name} {i_supervisor.user.last_name}"
    
    context = {
        "application_id": str(application_id),
        "student_name": f"{student.user.first_name} {student.user.last_name}" if student else "N/A",
        "position": opportunity.title,
        "employer_name": employer_name,
        "institution_name": institution_name,
        "start_date": opportunity.start_date.strftime("%d %b %Y") if opportunity.start_date else "N/A",
        "end_date": opportunity.end_date.strftime("%d %b %Y") if opportunity.end_date else "N/A",
        "department": opportunity.department or "N/A",
        "employer_supervisor_name": employer_supervisor_name,
        "institution_supervisor_name": institution_supervisor_name,
        "artifact_id": None, # Will be set after creation
        "tracking_code": None
    }

    # Create the artifact record first to get the ID
    tracking_code = _generate_tracking_code(ArtifactType.CERTIFICATE)
    artifact = Artifact.objects.create(
        application_id=application_id,
        student_id=application.student_id,
        artifact_type=ArtifactType.CERTIFICATE,
        generated_by=actor_id,
        metadata=context,
        tracking_code=tracking_code
    )
    
    context["artifact_id"] = str(artifact.id)
    context["tracking_code"] = tracking_code
    
    # Generate PDF
    # We use the native ReportLab generator for Certificates to ensure perfect layout
    try:
        pdf_content = _generate_certificate_native(context)
    except Exception as e:
        artifact.delete()
        raise Exception(f"Failed to generate PDF: {str(e)}")

    # Save file
    safe_name = student.user.first_name.lower() if student else "intern"
    filename = f"certificate_{safe_name}_{tracking_code}.pdf"
    artifact.file.save(filename, ContentFile(pdf_content))
    artifact.save()

    # Record Ledger Event
    record_event(
        event_type="CERTIFICATE_GENERATED",
        actor_id=actor_id,
        entity_id=application_id,
        entity_type="internship_application",
        payload={
            "artifact_id": str(artifact.id),
            "artifact_type": "CERTIFICATE",
            "tracking_code": tracking_code
        }
    )

    # Send Notification
    if student and student.user and student.user.email:
        send_certificate_generated_notification(
            student_email=student.user.email,
            student_name=context["student_name"],
            position=context["position"],
            employer_name=context["employer_name"],
            tracking_code=tracking_code,
            artifact_id=str(artifact.id),
            actor_id=str(actor_id) if actor_id else None
        )

    return artifact

def verify_artifact(identifier: str) -> dict:
    """
    Verifies an artifact's authenticity by cross-referencing with the ledger.
    Accepts either a UUID or a tracking_code.
    """
    artifact = None
    
    # 1. Try UUID
    try:
        artifact_uuid = UUID(str(identifier))
        artifact = Artifact.objects.get(id=artifact_uuid)
    except (Artifact.DoesNotExist, ValueError, TypeError):
        # 2. Try Tracking Code
        try:
            artifact = Artifact.objects.get(tracking_code=identifier)
        except Artifact.DoesNotExist:
            return {
                "verified": False,
                "error": "Artifact not found in system"
            }

    # Find ledger event
    event = find_event_by_artifact_id(str(artifact.id))
    if not event:
        return {
            "verified": False,
            "artifact": artifact,
            "error": "No ledger record found for this artifact"
        }

    # Verify basic data matches
    return {
        "verified": True,
        "artifact": artifact,
        "ledger_event": {
            "id": event.id,
            "occurred_at": event.occurred_at,
            "hash": event.hash,
            "type": event.event_type
        },
        "student_name": artifact.metadata.get("student_name", "N/A"),
        "type": artifact.get_artifact_type_display(),
        "generated_at": artifact.created_at,
        "tracking_code": artifact.tracking_code
    }

@transaction.atomic
def generate_performance_summary(*, application_id: UUID, actor_id: UUID) -> Artifact:
    """
    Generates a professional performance summary report for an internship.
    """
    application = get_application_by_id(application_id)
    if not application:
        raise ValueError("Application not found")

    student = get_student_by_id(str(application.student_id))
    opportunity = application.opportunity
    
    # Fetch employer and institution names
    employer_name = "N/A"
    if opportunity.employer_id:
        employer = get_employer_by_id(opportunity.employer_id)
        employer_name = employer.name if employer else "N/A"
        
    institution_name = _get_student_institution_info(application.student_id)

    # Aggregated Metrics
    evidence = get_evidence_for_application(application_id)
    logbooks_accepted = evidence.filter(evidence_type="LOGBOOK", status="ACCEPTED").count()
    milestones_reached = evidence.filter(evidence_type="MILESTONE", status="ACCEPTED").count()
    incidents = get_incidents_for_application(application_id)
    incident_count = incidents.count()
    
    # Final Feedback (Authored by supervisors on the Application model)
    final_feedback = application.final_feedback or "No final feedback recorded."
    
    # Fallback to SuccessStory or REPORT if final_feedback is empty (Legacy support)
    if final_feedback == "No final feedback recorded.":
        story = get_success_story_for_application(application_id)
        if story:
            final_feedback = story.employer_feedback or final_feedback
        else:
            # Fallback to latest REPORT evidence notes
            report_evidence = evidence.filter(evidence_type="REPORT", status="ACCEPTED").order_by("-created_at").first()
            if report_evidence:
                final_feedback = report_evidence.employer_review_notes or final_feedback

    context = {
        "application_id": str(application_id),
        "student_name": f"{student.user.first_name} {student.user.last_name}" if student else "N/A",
        "position": opportunity.title,
        "employer_name": employer_name,
        "institution_name": institution_name,
        "start_date": opportunity.start_date.strftime("%d %b %Y") if opportunity.start_date else "N/A",
        "end_date": opportunity.end_date.strftime("%d %b %Y") if opportunity.end_date else "N/A",
        "generated_at": datetime.now().strftime("%d %b %Y %H:%M"),
        "logbooks_accepted": logbooks_accepted,
        "milestones_reached": milestones_reached,
        "incident_count": incident_count,
        "final_feedback": final_feedback,
        "current_year": datetime.now().year,
        "artifact_id": None,
        "tracking_code": None
    }

    # Create artifact
    tracking_code = _generate_tracking_code(ArtifactType.PERFORMANCE_SUMMARY)
    artifact = Artifact.objects.create(
        application_id=application_id,
        student_id=application.student_id,
        artifact_type=ArtifactType.PERFORMANCE_SUMMARY,
        generated_by=actor_id,
        metadata=context,
        tracking_code=tracking_code
    )
    
    context["artifact_id"] = str(artifact.id)
    context["tracking_code"] = tracking_code

    # Generate PDF
    try:
        pdf_content = _generate_performance_summary_native(context)
    except Exception as e:
        artifact.delete()
        raise Exception(f"Failed to generate PDF: {str(e)}")

    # Save file
    safe_name = student.user.first_name.lower() if student else "intern"
    filename = f"performance_{safe_name}_{tracking_code}.pdf"
    artifact.file.save(filename, ContentFile(pdf_content))
    artifact.save()

    # Record Ledger Event
    record_event(
        event_type="PERFORMANCE_SUMMARY_GENERATED",
        actor_id=actor_id,
        entity_id=application_id,
        entity_type="internship_application",
        payload={
            "artifact_id": str(artifact.id),
            "artifact_type": "PERFORMANCE_SUMMARY",
            "tracking_code": tracking_code
        }
    )

    # Send Notification
    if student and student.user and student.user.email:
        send_performance_summary_generated_notification(
            student_email=student.user.email,
            student_name=context["student_name"],
            employer_name=context["employer_name"],
            logbooks_count=logbooks_accepted,
            milestones_count=milestones_reached,
            artifact_id=str(artifact.id),
            actor_id=str(actor_id) if actor_id else None
        )

    return artifact

@transaction.atomic
def generate_logbook_report(*, application_id: UUID, actor_id: UUID) -> Artifact:
    """
    Aggregates all logbook entries for an internship into a professional report.
    """
    application = get_application_by_id(application_id)
    if not application:
        raise ValueError("Application not found")

    student = get_student_by_id(str(application.student_id))
    opportunity = application.opportunity
    
    # Fetch employer and institution names
    employer_name = "N/A"
    if opportunity.employer_id:
        employer = get_employer_by_id(opportunity.employer_id)
        employer_name = employer.name if employer else "N/A"
        
    institution_name = _get_student_institution_info(application.student_id)

    # Fetch logbooks
    evidence_items = get_evidence_for_application(application_id).filter(
        evidence_type="LOGBOOK",
        status="ACCEPTED"
    ).order_by('created_at')
    
    logbooks_data = []
    for item in evidence_items:
        logbooks_data.append({
            "title": item.title,
            "description": item.description,
            "daily_entries": item.metadata.get("entries", {}),
            "employer_notes": item.employer_review_notes,
            "institution_notes": item.institution_review_notes,
            "submitted_at": item.created_at.strftime("%d %b %Y")
        })

    context = {
        "application_id": str(application_id),
        "student_name": f"{student.user.first_name} {student.user.last_name}" if student else "N/A",
        "position": opportunity.title,
        "employer_name": employer_name,
        "institution_name": institution_name,
        "start_date": opportunity.start_date.strftime("%d %b %Y") if opportunity.start_date else "N/A",
        "end_date": opportunity.end_date.strftime("%d %b %Y") if opportunity.end_date else "N/A",
        "generated_at": datetime.now().strftime("%d %b %Y %H:%M"),
        "current_year": datetime.now().year,
        "logbooks": logbooks_data,
        "artifact_id": None,
        "tracking_code": None
    }

    # Create artifact
    tracking_code = _generate_tracking_code(ArtifactType.LOGBOOK_REPORT)
    artifact = Artifact.objects.create(
        application_id=application_id,
        student_id=application.student_id,
        artifact_type=ArtifactType.LOGBOOK_REPORT,
        generated_by=actor_id,
        metadata=context,
        tracking_code=tracking_code
    )
    
    context["artifact_id"] = str(artifact.id)
    context["tracking_code"] = tracking_code

    # Generate PDF
    try:
        pdf_content = _generate_logbook_report_native(context)
    except Exception as e:
        artifact.delete()
        raise Exception(f"Failed to generate PDF: {str(e)}")

    # Save file
    safe_name = student.user.first_name.lower() if student else "intern"
    filename = f"logbook_report_{safe_name}_{tracking_code}.pdf"
    artifact.file.save(filename, ContentFile(pdf_content))
    artifact.save()

    # Record Ledger Event
    record_event(
        event_type="LOGBOOK_REPORT_GENERATED",
        actor_id=actor_id,
        entity_id=application_id,
        entity_type="internship_application",
        payload={
            "artifact_id": str(artifact.id),
            "artifact_type": "LOGBOOK_REPORT",
            "logbook_count": len(logbooks_data),
            "tracking_code": tracking_code
        }
    )

    # Send Notification
    if student and student.user and student.user.email:
        send_logbook_report_generated_notification(
            student_email=student.user.email,
            student_name=context["student_name"],
            employer_name=context["employer_name"],
            logbooks_count=len(logbooks_data),
            tracking_code=tracking_code,
            artifact_id=str(artifact.id),
            actor_id=str(actor_id) if actor_id else None
        )

    return artifact
