"""
Seed data for Smart Society Visitor Management.

Creates:
  - 1 admin        admin        / Admin@123
  - 2 guards       guard1..2    / Guard@123  (+ profiles)
  - 6 residents    resident1..6 / Resident@123 (+ profiles, flats A-101 ...)
  - 15 visitors
  - 10 visit requests across statuses (2+ pending for resident1/resident2
    so the approve/reject flow can be tested), with approvals,
    access logs for today, and notifications
  - society row "Green Meadows Society" (pk=1)

Idempotent: if the admin user already exists the command exits early.
"""

from datetime import time, timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import ResidentProfile, SecurityGuardProfile, User
from apps.society.models import Society
from apps.visitors.models import (
    AccessLog,
    Approval,
    Notification,
    VisitRequest,
    Visitor,
)
from apps.visitors.utils import generate_qr_token


class Command(BaseCommand):
    help = "Seed the database with demo users, visitors and visit requests."

    def handle(self, *args, **options):
        if User.objects.filter(username="admin").exists():
            self.stdout.write(self.style.WARNING("Seed data already exists — skipping."))
            return
        with transaction.atomic():
            self._seed()
        self.stdout.write(self.style.SUCCESS("Seed data created successfully."))

    # ------------------------------------------------------------------
    def _seed(self):
        now = timezone.now()

        # ---- Society --------------------------------------------------
        Society.objects.update_or_create(
            pk=1,
            defaults={
                "name": "Green Meadows Society",
                "address": "12 Palm Avenue, Sector 5",
                "city": "Pune",
                "total_flats": 120,
                "gates": 2,
                "contact_email": "office@greenmeadows.example",
                "contact_phone": "+91-20-4000-1234",
                "visiting_hours_start": time(9, 0),
                "visiting_hours_end": time(21, 0),
                "otp_enabled": True,
                "qr_enabled": True,
            },
        )

        # ---- Users ----------------------------------------------------
        admin = User.objects.create_user(
            username="admin", password="Admin@123", email="admin@greenmeadows.example",
            role=User.Role.ADMIN, is_staff=True, is_superuser=True,
        )
        guards = [
            User.objects.create_user(
                username=f"guard{i}", password="Guard@123",
                email=f"guard{i}@greenmeadows.example", role=User.Role.GUARD,
                phone=f"+91-98220-0000{i}",
            )
            for i in (1, 2)
        ]
        SecurityGuardProfile.objects.create(user=guards[0], shift="morning", gate="Main Gate", phone="+91-98220-00001")
        SecurityGuardProfile.objects.create(user=guards[1], shift="evening", gate="Back Gate", phone="+91-98220-00002")

        flat_plan = [
            ("A-101", "A", 1), ("A-202", "A", 2), ("B-101", "B", 1),
            ("B-302", "B", 3), ("C-201", "C", 2), ("C-401", "C", 4),
        ]
        residents = []
        for i, (flat_no, wing, floor) in enumerate(flat_plan, start=1):
            user = User.objects.create_user(
                username=f"resident{i}", password="Resident@123",
                email=f"resident{i}@greenmeadows.example", role=User.Role.RESIDENT,
                first_name=f"Resident{i}", phone=f"+91-98900-1000{i}",
            )
            ResidentProfile.objects.create(
                user=user, flat_no=flat_no, wing=wing, floor=floor,
                phone=f"+91-98900-1000{i}", family_members=2 + (i % 3),
            )
            residents.append(user)

        # ---- Visitors -------------------------------------------------
        visitor_specs = [
            ("Amit Sharma", "guest", "Aadhaar"), ("Priya Nair", "guest", "Aadhaar"),
            ("Rahul Verma", "delivery", "Driving Licence"), ("Sneha Iyer", "delivery", ""),
            ("Vikram Singh", "service", "Aadhaar"), ("Anita Desai", "service", "PAN"),
            ("Karan Malhotra", "cab", "Driving Licence"), ("Divya Menon", "guest", "Aadhaar"),
            ("Suresh Kumar", "delivery", ""), ("Meera Joshi", "service", "Aadhaar"),
            ("Arjun Patel", "guest", "Passport"), ("Neha Reddy", "cab", ""),
            ("Rohan Bose", "delivery", "Aadhaar"), ("Kavya Rao", "guest", "Aadhaar"),
            ("Imran Khan", "service", "PAN"),
        ]
        visitors = []
        for i, (name, vtype, proof) in enumerate(visitor_specs):
            visitors.append(
                Visitor.objects.create(
                    full_name=name, phone=f"+91-98765-43{100 + i:03d}",
                    id_proof_type=proof,
                    id_proof_number=f"ID-{2000 + i}" if proof else "",
                    visitor_type=vtype,
                    vehicle_number=f"MH-12-AB-{1000 + i}" if vtype in ("cab", "delivery") else "",
                    created_by=guards[0],
                )
            )

        # ---- Visit requests (10, across statuses) ---------------------
        # statuses: 2 pending (resident1, resident2), 2 approved, 2 checked_in,
        # 2 checked_out, 1 rejected, 1 cancelled
        statuses = [
            VisitRequest.Status.PENDING, VisitRequest.Status.PENDING,
            VisitRequest.Status.APPROVED, VisitRequest.Status.APPROVED,
            VisitRequest.Status.CHECKED_IN, VisitRequest.Status.CHECKED_IN,
            VisitRequest.Status.CHECKED_OUT, VisitRequest.Status.CHECKED_OUT,
            VisitRequest.Status.REJECTED, VisitRequest.Status.CANCELLED,
        ]
        resident_for = [residents[0], residents[1], residents[2], residents[3],
                        residents[4], residents[5], residents[0], residents[2],
                        residents[1], residents[3]]
        requests = []
        for i, st in enumerate(statuses):
            requests.append(
                VisitRequest.objects.create(
                    visitor=visitors[i % len(visitors)],
                    resident=resident_for[i],
                    purpose=f"Demo visit purpose #{i + 1}",
                    expected_at=now + timedelta(hours=2 + i),
                    status=st,
                    qr_token=generate_qr_token(),
                    created_by=guards[i % 2],
                )
            )

        # Approvals for approved/rejected ones.
        for req in requests:
            if req.status == VisitRequest.Status.APPROVED:
                Approval.objects.create(
                    visit_request=req, decided_by=req.resident,
                    decision=Approval.Decision.APPROVE, note="Sure, send them in.",
                )
            elif req.status == VisitRequest.Status.REJECTED:
                Approval.objects.create(
                    visit_request=req, decided_by=req.resident,
                    decision=Approval.Decision.REJECT, note="Not expecting anyone.",
                )

        # Access logs for today: checked_in -> entry; checked_out -> entry+exit.
        for req in requests:
            if req.status in (VisitRequest.Status.CHECKED_IN, VisitRequest.Status.CHECKED_OUT):
                AccessLog.objects.create(
                    visit_request=req, gate="Main Gate",
                    direction=AccessLog.Direction.IN, recorded_by=guards[0],
                )
            if req.status == VisitRequest.Status.CHECKED_OUT:
                AccessLog.objects.create(
                    visit_request=req, gate="Main Gate",
                    direction=AccessLog.Direction.OUT, recorded_by=guards[1],
                )

        # Notifications for residents with pending requests + a couple general.
        for req in requests:
            if req.status == VisitRequest.Status.PENDING:
                Notification.objects.create(
                    recipient=req.resident, title="New visitor request",
                    message=f"{req.visitor.full_name} wants to visit you. "
                            "Please approve or reject.",
                    related_request=req,
                )
        Notification.objects.create(
            recipient=residents[0], title="Society notice",
            message="Water maintenance on Sunday 10am–12pm. Please plan accordingly.",
        )
        Notification.objects.create(
            recipient=guards[0], title="Shift reminder",
            message="Evening shift starts at 4pm today at Main Gate.",
        )

        self.stdout.write(
            f"Created admin, {len(guards)} guards, {len(residents)} residents, "
            f"{len(visitors)} visitors, {len(requests)} visit requests."
        )
