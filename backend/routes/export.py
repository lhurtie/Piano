import io
import csv
import zipfile
from datetime import date, datetime
from typing import List

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
)

from database import get_db
from auth import get_current_user
from models import Patient, Session as SessionModel, Supervision, Supervisor, PatientStatus
import crud

router = APIRouter(prefix="/export", tags=["export"])


def format_date(d) -> str:
    if d is None:
        return ""
    if isinstance(d, (date, datetime)):
        return d.strftime("%d.%m.%Y")
    return str(d)


def format_currency(v: float) -> str:
    return f"{v:.2f} €"


@router.get("/pdf")
def export_pdf(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title", parent=styles["Title"],
        fontSize=18, spaceAfter=12, textColor=colors.HexColor("#1e3a5f")
    )
    heading_style = ParagraphStyle(
        "Heading", parent=styles["Heading2"],
        fontSize=13, spaceAfter=8, spaceBefore=14, textColor=colors.HexColor("#1e3a5f")
    )
    body_style = styles["Normal"]

    elements = []

    # Title
    elements.append(Paragraph("Piano – Ausbildungsfortschritt", title_style))
    elements.append(Paragraph(f"Exportiert am {format_date(date.today())}", body_style))
    elements.append(Spacer(1, 0.4 * cm))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1e3a5f")))
    elements.append(Spacer(1, 0.4 * cm))

    # Settings / progress
    settings = crud.get_all_settings(db)
    target_sessions = int(settings.get("target_therapy_sessions") or "600")
    target_sup_einzel = int(settings.get("target_supervision_einzel") or "50")
    target_sup_gruppe = int(settings.get("target_supervision_gruppe") or "100")
    target_self_exp = int(settings.get("target_self_experience") or "120")
    self_exp_enabled = (settings.get("self_experience_enabled") or "true").lower() == "true"
    self_exp_hours = float(settings.get("self_experience_hours") or "0")

    all_sessions = db.query(SessionModel).all()
    total_sessions = len(all_sessions)
    from models import SupervisionType as SVType
    all_supervisions = db.query(Supervision).all()
    total_supervision_einzel = sum(1 for s in all_supervisions if s.type == SVType.EINZEL)
    total_supervision_gruppe = sum(1 for s in all_supervisions if s.type == SVType.GRUPPE)
    total_supervision_count = len(all_supervisions)

    elements.append(Paragraph("Ausbildungsfortschritt", heading_style))
    progress_data = [
        ["Bereich", "Aktuell", "Ziel", "Fortschritt"],
        ["Therapiesitzungen", str(total_sessions), str(target_sessions),
         f"{min(100, round(total_sessions / target_sessions * 100)) if target_sessions > 0 else 0}%"],
        ["Supervision Einzel", str(total_supervision_einzel), str(target_sup_einzel),
         f"{min(100, round(total_supervision_einzel / target_sup_einzel * 100)) if target_sup_einzel > 0 else 0}%"],
        ["Supervision Gruppe", str(total_supervision_gruppe), str(target_sup_gruppe),
         f"{min(100, round(total_supervision_gruppe / target_sup_gruppe * 100)) if target_sup_gruppe > 0 else 0}%"],
    ]
    if self_exp_enabled:
        progress_data.append([
            "Selbsterfahrung (Std.)", f"{self_exp_hours:.1f}", str(target_self_exp),
            f"{min(100, round(self_exp_hours / target_self_exp * 100)) if target_self_exp > 0 else 0}%"
        ])

    progress_table = Table(progress_data, colWidths=[6 * cm, 3 * cm, 3 * cm, 3 * cm])
    progress_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(progress_table)
    elements.append(Spacer(1, 0.4 * cm))

    # Patients
    elements.append(Paragraph("Patienten", heading_style))
    patients = db.query(Patient).order_by(Patient.created_at).all()
    patient_data = [["Chiffre", "Status", "Sitzungen", "Erstellt"]]
    for p in patients:
        patient_data.append([
            p.chiffre,
            p.status.value,
            str(len(p.sessions)),
            format_date(p.created_at),
        ])

    if len(patient_data) > 1:
        pt = Table(patient_data, colWidths=[4 * cm, 5 * cm, 3 * cm, 4 * cm])
        pt.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(pt)
    else:
        elements.append(Paragraph("Keine Patienten vorhanden.", body_style))
    elements.append(Spacer(1, 0.4 * cm))

    # Sessions
    elements.append(Paragraph("Therapiesitzungen", heading_style))
    sessions = db.query(SessionModel).order_by(SessionModel.date.desc()).all()
    session_data = [["Datum", "Patient", "Phase", "Dauer (Min)", "Honorar"]]
    for s in sessions:
        patient = db.query(Patient).filter(Patient.id == s.patient_id).first()
        patient_sessions = db.query(SessionModel).filter(
            SessionModel.patient_id == s.patient_id
        ).order_by(SessionModel.date.asc()).all()
        sn = next((i + 1 for i, ps in enumerate(patient_sessions) if ps.id == s.id), 0)
        phase = crud.get_phase_for_session_number(sn)
        session_data.append([
            format_date(s.date),
            patient.chiffre if patient else "",
            phase,
            str(s.duration_minutes) if s.duration_minutes else "",
            format_currency(s.revenue_amount),
        ])

    if len(session_data) > 1:
        st = Table(session_data, colWidths=[3 * cm, 3 * cm, 3 * cm, 3 * cm, 4 * cm])
        st.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(st)
    else:
        elements.append(Paragraph("Keine Sitzungen vorhanden.", body_style))
    elements.append(Spacer(1, 0.4 * cm))

    # Supervisions
    elements.append(Paragraph("Supervisionen", heading_style))
    supervisions = db.query(Supervision).order_by(Supervision.date.desc()).all()
    sup_data = [["Datum", "Supervisor", "Typ", "Dauer (Min)", "Kosten"]]
    for s in supervisions:
        supervisor = db.query(Supervisor).filter(Supervisor.id == s.supervisor_id).first()
        sup_data.append([
            format_date(s.date),
            supervisor.name if supervisor else "",
            s.type.value,
            str(s.duration_minutes),
            format_currency(s.cost),
        ])

    if len(sup_data) > 1:
        sut = Table(sup_data, colWidths=[3 * cm, 4 * cm, 2.5 * cm, 3.5 * cm, 3 * cm])
        sut.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(sut)
    else:
        elements.append(Paragraph("Keine Supervisionen vorhanden.", body_style))
    elements.append(Spacer(1, 0.4 * cm))

    # Financial summary
    elements.append(Paragraph("Finanzübersicht", heading_style))
    monthly = crud.get_monthly_finance(db)
    fin_data = [["Monat", "Einnahmen", "Kosten", "Netto"]]
    for m in monthly[:12]:  # Last 12 months
        fin_data.append([
            m.month_label,
            format_currency(m.income),
            format_currency(m.costs),
            format_currency(m.net),
        ])

    if len(fin_data) > 1:
        ft = Table(fin_data, colWidths=[5 * cm, 4 * cm, 4 * cm, 3 * cm])
        ft.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4f8")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(ft)
    else:
        elements.append(Paragraph("Keine Finanzdaten vorhanden.", body_style))

    doc.build(elements)
    buffer.seek(0)

    filename = f"piano_export_{date.today().strftime('%Y-%m-%d')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/csv")
def export_csv(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Patients CSV
        patients_buf = io.StringIO()
        writer = csv.writer(patients_buf)
        writer.writerow(["id", "chiffre", "status", "erstellt", "antrag_gesendet", "antrag_genehmigt", "anzahl_sitzungen"])
        for p in db.query(Patient).order_by(Patient.id).all():
            writer.writerow([
                p.id, p.chiffre, p.status.value,
                format_date(p.created_at),
                format_date(p.antrag_gesendet_datum),
                format_date(p.antrag_genehmigt_datum),
                len(p.sessions),
            ])
        zf.writestr("patients.csv", patients_buf.getvalue())

        # Sessions CSV
        sessions_buf = io.StringIO()
        writer = csv.writer(sessions_buf)
        writer.writerow(["id", "patient_chiffre", "datum", "phase", "sitzungsnummer", "dauer_minuten", "honorar", "notizen"])
        sessions = db.query(SessionModel).order_by(SessionModel.date.asc()).all()
        for s in sessions:
            patient = db.query(Patient).filter(Patient.id == s.patient_id).first()
            patient_sessions = db.query(SessionModel).filter(
                SessionModel.patient_id == s.patient_id
            ).order_by(SessionModel.date.asc()).all()
            sn = next((i + 1 for i, ps in enumerate(patient_sessions) if ps.id == s.id), 0)
            phase = crud.get_phase_for_session_number(sn)
            writer.writerow([
                s.id,
                patient.chiffre if patient else "",
                format_date(s.date),
                phase,
                sn,
                s.duration_minutes or "",
                f"{s.revenue_amount:.2f}",
                s.notes or "",
            ])
        zf.writestr("sessions.csv", sessions_buf.getvalue())

        # Supervisions CSV
        sup_buf = io.StringIO()
        writer = csv.writer(sup_buf)
        writer.writerow(["id", "datum", "supervisor", "typ", "dauer_minuten", "kosten", "patienten", "notizen"])
        for s in db.query(Supervision).order_by(Supervision.date.asc()).all():
            supervisor = db.query(Supervisor).filter(Supervisor.id == s.supervisor_id).first()
            patients_str = "; ".join(p.chiffre for p in s.patients)
            writer.writerow([
                s.id,
                format_date(s.date),
                supervisor.name if supervisor else "",
                s.type.value,
                s.duration_minutes,
                f"{s.cost:.2f}",
                patients_str,
                s.notes or "",
            ])
        zf.writestr("supervisions.csv", sup_buf.getvalue())

    zip_buffer.seek(0)
    filename = f"piano_export_{date.today().strftime('%Y-%m-%d')}.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
