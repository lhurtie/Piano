from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime, Text,
    ForeignKey, Enum as SAEnum, Table
)
from sqlalchemy.orm import relationship
import enum

from database import Base


class PatientStatus(str, enum.Enum):
    PROBATORIK = "Probatorik"
    LAUFEND = "Therapie laufend"
    ABGESCHLOSSEN = "Therapie abgeschlossen"


class SupervisionType(str, enum.Enum):
    EINZEL = "Einzel"
    GRUPPE = "Gruppe"


# Many-to-many join table
supervision_patients = Table(
    "supervision_patients",
    Base.metadata,
    Column("supervision_id", Integer, ForeignKey("supervisions.id"), primary_key=True),
    Column("patient_id", Integer, ForeignKey("patients.id"), primary_key=True),
)


class Supervisor(Base):
    __tablename__ = "supervisors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    supervisions = relationship("Supervision", back_populates="supervisor")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, autoincrement=True)
    chiffre = Column(String, unique=True, nullable=False)
    status = Column(
        SAEnum(PatientStatus),
        default=PatientStatus.PROBATORIK,
        nullable=False,
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    antrag_gesendet_datum = Column(Date, nullable=True)
    antrag_genehmigt_datum = Column(Date, nullable=True)
    phase_override = Column(String, nullable=True)

    sessions = relationship("Session", back_populates="patient", cascade="all, delete-orphan")
    supervisions = relationship("Supervision", secondary=supervision_patients, back_populates="patients")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    date = Column(Date, nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    revenue_amount = Column(Float, nullable=False, default=90.0)
    session_type = Column(String, nullable=False, default="Einzelsitzung")

    patient = relationship("Patient", back_populates="sessions")


class Supervision(Base):
    __tablename__ = "supervisions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    supervisor_id = Column(Integer, ForeignKey("supervisors.id"), nullable=False)
    date = Column(Date, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    type = Column(SAEnum(SupervisionType), nullable=False)
    cost = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)

    supervisor = relationship("Supervisor", back_populates="supervisions")
    patients = relationship("Patient", secondary=supervision_patients, back_populates="supervisions")


class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=True)
