"""
Script to add 3 therapists with different specializations and unavailable dates.
Run: python add_therapists.py
"""

import os
import sys
import django
from datetime import datetime, timedelta
import random

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.accounts.models import User, CounsellorProfile, Specialization, AvailabilitySlot, UnavailableDate
from decimal import Decimal

def add_unavailable_dates(therapist):
    """Add 5 random unavailable dates per month for the next 3 months."""
    today = datetime.now().date()
    unavailable_dates = []
    reasons = ['Holiday', 'Personal leave', 'Training', 'Conference', 'Vacation', 'Family event']
    
    for month_offset in range(3):  # Next 3 months
        # Calculate month start
        if month_offset == 0:
            # Current month
            month_start = today.replace(day=1)
            year = today.year
            month = today.month
        else:
            # Future months
            year = today.year
            month = today.month + month_offset
            if month > 12:
                year += 1
                month -= 12
            month_start = datetime(year, month, 1).date()
        
        # Get last day of the month
        if month == 12:
            month_end = datetime(year + 1, 1, 1).date() - timedelta(days=1)
        else:
            month_end = datetime(year, month + 1, 1).date() - timedelta(days=1)
        
        # Only include future dates
        if month_end < today:
            continue
        
        # Generate 5 random dates in this month (excluding past dates)
        valid_dates = []
        current_date = month_start if month_start >= today else today
        while current_date <= month_end:
            valid_dates.append(current_date)
            current_date += timedelta(days=1)
        
        if len(valid_dates) > 5:
            random_dates = random.sample(valid_dates, 5)
        else:
            random_dates = valid_dates
        
        for date in random_dates:
            reason = random.choice(reasons)
            unavailable_dates.append((date, reason))
    
    # Create unavailable dates
    created_count = 0
    for date, reason in unavailable_dates:
        _, created = UnavailableDate.objects.get_or_create(
            counsellor=therapist,
            date=date,
            defaults={'reason': reason}
        )
        if created:
            created_count += 1
    
    print(f"   Added {created_count} new unavailable dates for {therapist.get_full_name()}")

def create_therapist(name, email, phone, license_number, specialization_names, fees, availability_names, experience):
    """Create a therapist with profile and unavailable dates."""
    
    # Check if user already exists by email
    if User.objects.filter(email=email).exists():
        print(f"⚠️  Therapist with email {email} already exists. Using existing user...")
        user = User.objects.get(email=email)
        # Update user details
        user.first_name = name.split()[0]
        user.last_name = name.split()[1] if len(name.split()) > 1 else ''
        if not User.objects.filter(phone=phone).exclude(id=user.id).exists():
            user.phone = phone
        user.role = User.Roles.COUNSELLOR
        user.is_active = True
        user.email_verified = True
        user.save()
    elif User.objects.filter(phone=phone).exists():
        print(f"⚠️  User with phone {phone} already exists. Generating new phone...")
        # Generate a unique phone number
        base_phone = phone
        counter = 1
        while User.objects.filter(phone=phone).exists():
            phone = f"{base_phone[:-1]}{counter}"
            counter += 1
        print(f"   Using phone: {phone}")
        user = User.objects.create_user(
            email=email,
            password='Therapist@123',  # Default password - change in production
            first_name=name.split()[0],
            last_name=name.split()[1] if len(name.split()) > 1 else '',
            phone=phone,
            role=User.Roles.COUNSELLOR,
            is_active=True,
            email_verified=True,
        )
    else:
        # Create new user
        user = User.objects.create_user(
            email=email,
            password='Therapist@123',  # Default password - change in production
            first_name=name.split()[0],
            last_name=name.split()[1] if len(name.split()) > 1 else '',
            phone=phone,
            role=User.Roles.COUNSELLOR,
            is_active=True,
            email_verified=True,
        )
    
    # Check if profile already exists
    try:
        profile = CounsellorProfile.objects.get(user=user)
        print(f"⚠️  Profile already exists for {email}. Updating...")
    except CounsellorProfile.DoesNotExist:
        profile = None
    
    # Get specializations
    specializations = []
    for spec_name in specialization_names:
        try:
            spec = Specialization.objects.get(name=spec_name)
            specializations.append(spec)
        except Specialization.DoesNotExist:
            print(f"Warning: Specialization '{spec_name}' not found. Skipping.")
    
    # Get availability slots
    availability_slots = []
    for avail_name in availability_names:
        try:
            # Map frontend names to database names
            avail_map = {
                'Weekdays': 'weekdays',
                'Weekends': 'weekends',
                'Evenings': 'evenings',
                'Morning': 'morning',
            }
            db_name = avail_map.get(avail_name, avail_name.lower())
            avail = AvailabilitySlot.objects.get(name=db_name)
            availability_slots.append(avail)
        except AvailabilitySlot.DoesNotExist:
            print(f"Warning: Availability '{avail_name}' not found. Skipping.")
    
    # Create or update counsellor profile
    if profile is None:
        profile = CounsellorProfile.objects.create(
            user=user,
            license_number=license_number,
            fees_per_session=Decimal(str(fees)),
            experience=experience,
            is_verified_professional=True,
        )
    else:
        # Update existing profile
        profile.license_number = license_number
        profile.fees_per_session = Decimal(str(fees))
        profile.experience = experience
        profile.is_verified_professional = True
        profile.save()
    
    # Set specializations and availability
    if specializations:
        profile.specializations.set(specializations)
    if availability_slots:
        profile.availability.set(availability_slots)
    
    print(f"✅ Created/Updated therapist: {name} ({email})")
    print(f"   License: {license_number}")
    print(f"   Specializations: {', '.join(specialization_names)}")
    print(f"   Fees: ₹{fees}/session")
    print(f"   Availability: {', '.join(availability_names)}")
    
    return user, profile

def main():
    print("=" * 60)
    print("Adding 3 Therapists with Unavailable Dates")
    print("=" * 60)
    print()
    
    # Therapist 1: Anxiety & Depression Specialist
    print("Creating Therapist 1: Anxiety & Depression Specialist")
    therapist1, profile1 = create_therapist(
        name="Dr. Sarah Johnson",
        email="sarah.johnson@mindease.com",
        phone="9876543211",
        license_number="LIC-ANX-001",
        specialization_names=["Anxiety", "Depression"],
        fees=1500.00,
        availability_names=["Weekdays", "Evenings"],
        experience="8 years of experience in treating anxiety and depression. Certified in CBT and Mindfulness-based therapy."
    )
    print()
    
    # Therapist 2: Relationship Counselling Specialist
    print("Creating Therapist 2: Relationship Counselling Specialist")
    therapist2, profile2 = create_therapist(
        name="Dr. Michael Chen",
        email="michael.chen@mindease.com",
        phone="9876543212",
        license_number="LIC-REL-002",
        specialization_names=["Relationship Counselling"],
        fees=2000.00,
        availability_names=["Weekends", "Evenings"],
        experience="10 years of experience in relationship and couples therapy. Specialized in communication and conflict resolution."
    )
    print()
    
    # Therapist 3: Multi-specialization Therapist
    print("Creating Therapist 3: Multi-specialization Therapist")
    therapist3, profile3 = create_therapist(
        name="Dr. Priya Sharma",
        email="priya.sharma@mindease.com",
        phone="9876543213",
        license_number="LIC-MULT-003",
        specialization_names=["Anxiety", "Depression", "Relationship Counselling"],
        fees=1800.00,
        availability_names=["Weekdays", "Weekends"],
        experience="12 years of experience in various therapeutic approaches. Expert in anxiety, depression, and relationship issues."
    )
    print()
    
    # Update unavailable dates for all therapists
    print("Adding unavailable dates for all therapists...")
    add_unavailable_dates(therapist1)
    add_unavailable_dates(therapist2)
    add_unavailable_dates(therapist3)
    print()
    
    print("=" * 60)
    print("✅ All therapists created successfully!")
    print("=" * 60)
    print()
    print("Therapist Details:")
    print(f"1. {therapist1.get_full_name()} - {therapist1.email} - Password: Therapist@123")
    print(f"2. {therapist2.get_full_name()} - {therapist2.email} - Password: Therapist@123")
    print(f"3. {therapist3.get_full_name()} - {therapist3.email} - Password: Therapist@123")
    print()
    print("Note: Each therapist has 5 random unavailable dates per month for the next 3 months.")
    print("Please change the passwords after first login in production.")

if __name__ == "__main__":
    main()
