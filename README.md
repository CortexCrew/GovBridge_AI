# GovBridge AI

GovBridge AI is a full-stack government services platform with:
- citizen authentication and profile management
- certificate application workflow
- officer login and officer dashboard
- complaint flow with department-based visibility
- AI-assisted complaint processing

## Project structure

- `Backend/` — Node.js + Express + PostgreSQL backend
- `ai_service/` — Python AI service
- `Frontend/` — frontend app

## Backend setup

1. Go to the backend folder:
   ```bash
   cd Backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file from the example if needed:
   ```bash
   copy .env.example .env
   ```

4. Update the database values in `.env`.

5. Start the backend:
   ```bash
   npm run dev
   ```

The backend runs on:
```text
http://localhost:5000
```

## AI service setup

1. Go to the AI service folder:
   ```bash
   cd ai_service
   ```

2. Create a virtual environment if needed and install dependencies.

3. Start the service:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```

## Current backend scope

This project currently supports:
- citizen register/login
- certificate application submission
- certificate document upload
- officer login and dashboard
- officer certificate-type visibility
- department-based complaint visibility

Not part of the current scope:
- Digital Locker
- notifications
- complaint assignment
- complaint history
- escalation
- extra officer mapping tables

## Useful test endpoints

### Citizen register
```http
POST http://localhost:5000/api/auth/register
```

Body:
```json
{
  "name": "John Citizen",
  "email": "john.citizen@example.com",
  "password": "Citizen@123",
  "phone": "9876543210",
  "address": "Main Road, City",
  "city": "Bengaluru",
  "state": "Karnataka",
  "pincode": "560001"
}
```

### Citizen login
```http
POST http://localhost:5000/api/auth/login
```

Body:
```json
{
  "email": "john.citizen@example.com",
  "password": "Citizen@123"
}
```

### Officer login
```http
POST http://localhost:5000/api/officer/login
```

Body:
```json
{
  "email": "arun@govbridge.com",
  "password": "GovBridge@123"
}
```

### Officer dashboard
```http
GET http://localhost:5000/api/officer/dashboard
```

Headers:
```http
Authorization: Bearer <officer-token>
```

### Complaint list
```http
GET http://localhost:5000/api/complaints
```

Headers:
```http
Authorization: Bearer <token>
```

### Certificate apply
```http
POST http://localhost:5000/api/certificates/apply
```

Headers:
```http
Authorization: Bearer <citizen-token>
```

Form-data:
```text
certificate_type=Income Certificate
documents=@your-file.pdf
```

## Notes

- Do not send `officer_id` or `department_id` from the request body to authorize a user.
- The backend uses the authenticated JWT identity.
- Officer visibility is filtered by certificate type and department.
