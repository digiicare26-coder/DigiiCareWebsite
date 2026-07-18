@echo off

echo ====================================
echo DIGIICARE - Database Migrations
echo ====================================
echo.

echo [1/15] Running 000...
psql -U postgres -d healthcare_db -f database/migrations/000_create_identity_tables.sql

echo [2/15] Running 001...
psql -U postgres -d healthcare_db -f database/migrations/001_create_vitals_table.sql

echo [3/15] Running 002...
psql -U postgres -d healthcare_db -f database/migrations/002_create_scans_tables.sql

echo [4/15] Running 003...
psql -U postgres -d healthcare_db -f database/migrations/003_create_otp_table.sql

echo [5/15] Running 004...
psql -U postgres -d healthcare_db -f database/migrations/004_add_signup_fields.sql

echo [6/15] Running 005...
psql -U postgres -d healthcare_db -f database/migrations/005_add_patient_profile_doctor_consultation.sql

echo [7/15] Running 006...
psql -U postgres -d healthcare_db -f database/migrations/006_create_medicines_table.sql

echo [8/15] Running 007...
psql -U postgres -d healthcare_db -f database/migrations/007_add_sub_account_uid.sql

echo [9/15] Running 008...
psql -U postgres -d healthcare_db -f database/migrations/008_merge_sub_accounts_into_patients.sql

echo [10/15] Running 009...
psql -U postgres -d healthcare_db -f database/migrations/009_add_doctor_auth_and_logout.sql

echo [11/15] Running 010...
psql -U postgres -d healthcare_db -f database/migrations/010_add_consent_log.sql

echo [12/15] Running 011...
psql -U postgres -d healthcare_db -f database/migrations/011_add_deidentification_constraints.sql

echo [13/15] Running 012...
psql -U postgres -d healthcare_db -f database/migrations/012_add_rewards.sql

echo [14/15] Running 013...
psql -U postgres -d healthcare_db -f database/migrations/013_add_redemption_requests.sql

echo [15/15] Running 014...
psql -U postgres -d healthcare_db -f database/migrations/014_add_print_fields.sql

echo [16/15] Running 015...
psql -U postgres -d healthcare_db -f database/migrations/015_add_scan_versioning.sql

echo.
echo  ✅ ALL DONE! (16 migrations completed)
pause