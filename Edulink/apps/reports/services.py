import os
from uuid import UUID
from datetime import datetime
from io import BytesIO
from django.conf import settings
from django.template.loader import render_to_string
from django.core.files.base import ContentFile
from django.db import transaction
from xhtml2pdf import pisa

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
        
    if application.status not in ["COMPLETED", "CERTIFIED"]:
        raise ValueError("Internship must be marked as COMPLETED or CERTIFIED to generate a certificate")

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
    pdf_content = _render_pdf("reports/certificate.html", context)
    if not pdf_content:
        artifact.delete()
        raise Exception("Failed to generate PDF")

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
    pdf_content = _render_pdf("reports/performance_summary.html", context)
    if not pdf_content:
        artifact.delete()
        raise Exception("Failed to generate PDF")

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
    pdf_content = _render_pdf("reports/internship_report.html", context)
    if not pdf_content:
        artifact.delete()
        raise Exception("Failed to generate PDF")

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

    return artifact
