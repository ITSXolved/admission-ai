# User Creation Scripts

This directory contains helper scripts to create user accounts for the admission system.

## Prerequisites

1. Install `tsx` for running TypeScript scripts:
```bash
npm install -D tsx
```

2. Make sure your `.env.local` file has the required Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Creating an Exam Controller

Run the interactive script:

```bash
npx tsx scripts/create-exam-controller.ts
```

You'll be prompted to enter:
- Full Name
- Email (used for login)
- Password
- School ID (optional)

**Login credentials:**
- Use the **email** and **password** you entered
- Login at: `http://localhost:3000/login`

---

## Creating a Candidate

### Step 1: Create Admission Enquiry

First, you need to have an admission enquiry in the database. You can create one via SQL:

```sql
INSERT INTO admission_enquiries (
  first_name, 
  last_name, 
  email, 
  phone, 
  applying_grade,
  school_id
) VALUES (
  'John',
  'Doe',
  'john.doe@example.com',
  '+919876543210',
  '10',
  'your-school-id'
) RETURNING id;
```

Copy the returned `id`.

### Step 2: Generate Credentials

Run the script with the admission enquiry ID:

```bash
npx tsx scripts/create-candidate.ts <admission-enquiry-id>
```

Example:
```bash
npx tsx scripts/create-candidate.ts 123e4567-e89b-12d3-a456-426614174000
```

The script will output:
- Username (auto-generated)
- Password (random, secure)

**Login credentials:**
- Use the **username** (not email) and **password** shown
- Login at: `http://localhost:3000/login`

---

## Alternative: Using the API

You can also create candidate credentials via the API endpoint:

```bash
curl -X POST http://localhost:3000/api/generate-credentials \
  -H "Content-Type: application/json" \
  -d '{"admissionEnquiryId": "your-enquiry-id"}'
```

**Note:** This requires authentication as an exam controller.

---

## Quick Test Setup

To quickly set up a test environment:

1. **Create an Exam Controller:**
```bash
npx tsx scripts/create-exam-controller.ts
# Enter: Test Admin, admin@test.com, password123
```

2. **Create a test admission enquiry** (via Supabase SQL Editor):
```sql
INSERT INTO admission_enquiries (
  first_name, last_name, email, phone, applying_grade
) VALUES (
  'Test', 'Student', 'student@test.com', '+919999999999', '10'
) RETURNING id;
```

3. **Create candidate credentials:**
```bash
npx tsx scripts/create-candidate.ts <id-from-step-2>
```

4. **Test both logins:**
   - Exam Controller: `admin@test.com` / `password123`
   - Candidate: `teststudent<id>` / `<generated-password>`

---

## Security Notes

- **Never commit** passwords or credentials to version control
- The service role key should be kept **secret** and only used server-side
- Candidate passwords are randomly generated and shown **only once**
- Consider implementing password reset functionality for production use
