# EduLink Report Generation And Signature Plan

## Direction

Official EduLink documents should be generated server-side by the `reports` app. The frontend may preview or download student drafts, but official artifacts must come from one backend pipeline so branding, layout, verification codes, ledger events, permissions, and digital signatures stay consistent.

## Single Ownership

- `reports/pdf_theme.py`: brand color, document colors, margins, and report constants.
- `reports/pdf_components.py`: reusable PDF building blocks such as key-value tables, section bands, review panels, and digital signature blocks.
- `reports/services.py`: artifact business actions only. It gathers domain data through query APIs, creates the artifact, generates the PDF, records ledger events, stores the file, and sends notifications.

## Signature Model

Current implementation uses platform digital signatures from existing authoritative events:

- Student signature: logbook submission actor and submission timestamp.
- Employer supervisor signature: employer review actor, status, and review timestamp.
- Institution assessor signature: institution review actor, status, and review timestamp.
- EduLink ledger signature: artifact tracking code and generation timestamp.

Future enhancement: add optional uploaded/drawn signature assets per actor profile. Those assets should be referenced from employer/institution account domains, but official artifact rendering should still happen only in `reports`.

## Document Design Standard

Industrial attachment logbooks should retain the standard structure:

- Student particulars and placement details.
- Monday to Friday progress chart.
- Description of work done and new skills learnt.
- Trainee weekly report.
- Employer supervisor feedback.
- Institution assessor feedback.
- Digital signatures.
- Public verification code.

The visual treatment should remain minimal: teal brand accent, soft section bands, readable tables, restrained borders, strong spacing, and no decorative clutter.

## Package Direction

- Official artifacts: ReportLab through the reports app.
- Legacy audit export using `xhtml2pdf`: keep temporarily, migrate into the reports PDF kit later.
- Frontend `jsPDF` weekly export: treat as draft convenience only; official logbook reports should use generated artifacts.

