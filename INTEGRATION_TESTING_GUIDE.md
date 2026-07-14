## ✅ **Bhai! Updated Testing Guide — Simple & To The Point**

---

## 🚀 **DigiiCare Backend — Testing Guide**

---

### **1. Setup**

```bash
# Install dependencies
npm install

# Create database
psql -U postgres -c "CREATE DATABASE healthcare_db;"

# Run migrations
psql -U postgres -d healthcare_db -f database/migrations/001_create_identity_tables.sql
psql -U postgres -d healthcare_db -f database/migrations/002_create_vitals_table.sql
psql -U postgres -d healthcare_db -f database/migrations/003_create_scans_tables.sql
psql -U postgres -d healthcare_db -f database/migrations/004_create_otp_table.sql
psql -U postgres -d healthcare_db -f database/migrations/005_add_signup_fields.sql
psql -U postgres -d healthcare_db -f database/migrations/006_add_patient_profile_doctor_consultation.sql
psql -U postgres -d healthcare_db -f database/migrations/007_create_medicines_table.sql
psql -U postgres -d healthcare_db -f database/migrations/008_add_sub_account_uid.sql
psql -U postgres -d healthcare_db -f database/migrations/009_add_doctor_auth_tables.sql

# Generate Prisma clients
npm run prisma:generate

# Import medicine data
npm run import:medicines

# Start server
npm run dev
```

---

### **2. Test APIs**

#### **A. Patient Flow**

| Step | API | Method |
|------|-----|--------|
| 1 | `/api/auth/signup` | POST |
| 2 | `/api/auth/request-otp` | POST |
| 3 | `/api/auth/verify-otp` | POST → Get JWT |
| 4 | `/api/profile` | POST |
| 5 | `/api/storage/prescription` | POST |
| 6 | `/api/storage/scans` | GET |
| 7 | `/api/search/scans?q=medicine` | GET |

#### **B. Doctor Flow**

| Step | API | Method |
|------|-----|--------|
| 1 | `/api/doctor-auth/signup` | POST |
| 2 | `/api/doctor-auth/request-otp` | POST |
| 3 | `/api/doctor-auth/verify-otp` | POST → Get JWT |
| 4 | `/api/doctor` | POST |
| 5 | `/api/doctor` | GET |
| 6 | `/api/recommend` | POST |
| 7 | `/api/recommend/search?q=para` | GET |

#### **C. Family Members**

| Step | API | Method |
|------|-----|--------|
| 1 | `/api/family` | POST (add wife/kid) |
| 2 | `/api/family` | GET (list family) |

---

### **3. Environment Variables (.env)**

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=healthcare_db

IDENTITY_DB_USER=postgres
IDENTITY_DB_PASSWORD=rida12345

CLINICAL_DB_USER=postgres
CLINICAL_DB_PASSWORD=rida12345

IDENTITY_DATABASE_URL=postgresql://postgres:rida12345@localhost:5432/healthcare_db?schema=identity_schema
CLINICAL_DATABASE_URL=postgresql://postgres:rida12345@localhost:5432/healthcare_db?schema=clinical_schema

JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

LINK_TOKEN_SECRET=your_link_token_secret

OTP_SECRET=your_otp_secret
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=5

GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_app_password

STORAGE_PATH=./uploads
STORAGE_PROVIDER=local

PORT=5000
```

---

### **4. Project Structure**

```
DigiiCare1/
├── database/migrations/      # 9 SQL files
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── repositories/
│   ├── routes/
│   └── services/
├── generated/                # Prisma clients
├── uploads/                  # File storage
├── data/                     # Medicine CSV
├── .env
├── db.js
├── server.js
└── package.json
```

---

### **5. Common Errors & Fixes**

| Error | Fix |
|-------|-----|
| `password authentication failed` | Check `.env` password |
| `schema does not exist` | Run migrations again |
| `Cannot find module '../../generated/...'` | Run `npm run prisma:generate` |
| `JWT expired` | Login again |
| `port 5000 already in use` | Change `PORT=5001` |

---

## ✅ **Final Checklist**

- [ ] PostgreSQL installed
- [ ] `healthcare_db` created
- [ ] All 9 migrations run
- [ ] Prisma clients generated
- [ ] Medicine data imported
- [ ] Server running (`npm run dev`)
- [ ] Patient APIs tested
- [ ] Doctor APIs tested
- [ ] Storage APIs tested

---

**🎉 Ready for Frontend Integration!**