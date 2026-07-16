@echo off

echo ====================================
echo DIGIICARE - Database Migrations
echo ====================================
echo.

echo [1/11] Running 000...
psql -U postgres -d healthcare_db -f database/migrations/000_create_identity_tables.sql

echo [2/11] Running 001...
psql -U postgres -d healthcare_db -f database/migrations/001_create_vitals_table.sql

echo [3/11] Running 002...
psql -U postgres -d healthcare_db -f database/migrations/002_create_scans_tables.sql

echo [4/11] Running 003...
psql -U postgres -d healthcare_db -f database/migrations/003_create_otp_table.sql

echo [5/11] Running 004...
psql -U postgres -d healthcare_db -f database/migrations/004_add_signup_fields.sql

echo [6/11] Running 005...
psql -U postgres -d healthcare_db -f database/migrations/005_add_patient_profile_doctor_consultation.sql

echo [7/11] Running 006...
psql -U postgres -d healthcare_db -f database/migrations/006_create_medicines_table.sql

echo [8/11] Running 007...
psql -U postgres -d healthcare_db -f database/migrations/007_add_sub_account_uid.sql

echo [9/11] Running 008...
psql -U postgres -d healthcare_db -f database/migrations/008_merge_sub_accounts_into_patients.sql

echo [10/11] Running 009...
psql -U postgres -d healthcare_db -f database/migrations/009_add_doctor_auth_and_logout.sql

echo [11/11] Running 011...
psql -U postgres -d healthcare_db -f database/migrations/011_add_deidentification_constraints.sql

echo.
echo  ✅ ALL DONE!
pause
