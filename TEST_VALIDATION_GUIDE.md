# Test Validation Guide

## Setup

Ensure the `complaints` table has the `department_id` column:

```sql
-- Add to complaints table if not already present
ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL;
```

Verify departments table exists with correct data:
```sql
SELECT * FROM departments ORDER BY department_id;
```

---

## Test Case 1: Exact Match

**Complaint Input:**
```json
{
  "title": "Pothole near college",
  "description": "There is a large pothole near my college and it is dangerous for vehicles."
}
```

**Expected AI Response:**
```json
{
  "category": "Road",
  "priority": "High",
  "department": "Public Works Department",
  "summary": "Large pothole reported near college."
}
```

**Expected Database State After:**
```sql
SELECT complaint_id, title, category, priority, department_id, ai_summary, status
FROM complaints
WHERE title = 'Pothole near college';

-- Result should show:
-- complaint_id: X
-- title: Pothole near college
-- category: Road
-- priority: High
-- department_id: 9  ← NOT NULL
-- ai_summary: Large pothole reported near college.
-- status: Pending
```

**Validation Query:**
```sql
SELECT 
  c.complaint_id,
  c.title,
  c.department_id,
  d.department_name
FROM complaints c
LEFT JOIN departments d ON c.department_id = d.department_id
WHERE c.complaint_id = X;

-- Expected output: department_id = 9, department_name = "Public Works Department"
```

---

## Test Case 2: Case Insensitive Match

**Scenario:** What if AI returns lowercase?

**Mock AI Response:**
```json
{
  "category": "Road",
  "priority": "High",
  "department": "public works department",
  "summary": "Pothole near the main street."
}
```

**Expected Result:**
- Database query uses: `LOWER(TRIM("public works department")) = LOWER(TRIM("Public Works Department"))`
- Match found: `department_id = 9`
- Complaint saved with `department_id = 9` ✅

**Validation Query:**
```sql
-- Verify the lookup logic works
SELECT department_id 
FROM departments
WHERE LOWER(TRIM(department_name)) = LOWER(TRIM('public works department'))
AND is_active = TRUE;

-- Should return: 9
```

---

## Test Case 3: Whitespace Handling

**Scenario:** AI returns department with extra spaces

**Mock AI Response:**
```json
{
  "category": "Water",
  "priority": "Medium",
  "department": "  Water Supply Department  ",
  "summary": "Water supply interruption."
}
```

**Expected Result:**
- Database query uses: `LOWER(TRIM("  Water Supply Department  ")) = LOWER(TRIM("Water Supply Department"))`
- Match found: `department_id = 4`
- Complaint saved with `department_id = 4` ✅

---

## Test Case 4: Unknown Department (Error Handling)

**Scenario:** AI returns a department that doesn't exist

**Mock AI Response:**
```json
{
  "category": "Roads",
  "priority": "High",
  "department": "Road Construction Department",
  "summary": "Potholes need fixing."
}
```

**Expected Behavior:**
1. Complaint is created with `department_id = NULL`
2. AI parsing succeeds
3. Department lookup is attempted:
   ```sql
   SELECT department_id FROM departments
   WHERE LOWER(TRIM('Road Construction Department')) = LOWER(TRIM(department_name))
   AND is_active = TRUE
   ```
4. Query returns no rows
5. Error is thrown:
   ```
   Department lookup failed. AI returned "Road Construction Department" but no matching department found in database.
   ```
6. Service catches error and **deletes** the complaint
7. Error is propagated to controller
8. Client receives HTTP 500 with error message

**HTTP Response:**
```json
{
  "success": false,
  "message": "Department lookup failed. AI returned \"Road Construction Department\" but no matching department found in database."
}
```

**Validation:** Complaint should NOT exist in database
```sql
SELECT COUNT(*) FROM complaints WHERE title = 'Pothole near...';
-- Should return: 0 (complaint was deleted)
```

---

## Test Case 5: Disabled Department (is_active = FALSE)

**Scenario:** Department exists but is marked inactive

**Setup:**
```sql
-- Simulate a disabled department
UPDATE departments 
SET is_active = FALSE 
WHERE department_id = 99;
```

**Mock AI Response:**
```json
{
  "department": "Some Inactive Department"
}
```

**Expected Behavior:**
- Query includes `AND is_active = TRUE`
- Inactive departments are skipped
- Lookup fails
- Error thrown: "Department lookup failed..."
- Complaint deleted

This ensures only active departments can be assigned to complaints.

---

## Complete Test Workflow

### Manual cURL Test

```bash
# 1. Get authentication token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"citizen@example.com","password":"password123"}'

# Copy the token from response

# 2. Submit complaint
curl -X POST http://localhost:5000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Pothole near college",
    "description": "There is a large pothole near my college and it is dangerous for vehicles."
  }'

# Expected success response:
{
  "success": true,
  "data": {
    "complaint_id": 1,
    "title": "Pothole near college",
    "description": "There is a large pothole...",
    "category": "Road",
    "priority": "High",
    "department_id": 9,
    "ai_summary": "Large pothole reported near college.",
    "status": "Pending",
    "created_at": "2024-XX-XX...",
    "updated_at": "2024-XX-XX..."
  }
}

# 3. Verify in database
psql -U postgres -d govbridge_db -c "
  SELECT c.complaint_id, c.title, c.department_id, d.department_name
  FROM complaints c
  LEFT JOIN departments d ON c.department_id = d.department_id
  WHERE c.complaint_id = 1;
"

# Should show: department_id = 9, department_name = "Public Works Department"
```

---

## Debugging Tips

### If department_id is NULL

**Possible causes:**
1. Complaints table doesn't have `department_id` column
2. AI is returning a department name not in the database
3. Department lookup query has a syntax error

**Debug steps:**
```sql
-- 1. Check if column exists
\d complaints;  -- PostgreSQL

-- 2. Test the lookup query manually
SELECT department_id
FROM departments
WHERE LOWER(TRIM(department_name)) = LOWER(TRIM('Public Works Department'))
AND is_active = TRUE;

-- 3. Check all active departments
SELECT department_id, department_name FROM departments WHERE is_active = TRUE;

-- 4. Check complaint record
SELECT complaint_id, department_id, category, priority FROM complaints WHERE complaint_id = X;
```

### If complaint is deleted when it shouldn't be

**Check error logs:**
```
Console output should show:
"Department lookup error: Department lookup failed. AI returned '...' but..."
"AI processing failed for complaint: Department lookup failed..."
```

### If lookup query isn't case-insensitive

**Test the LOWER(TRIM()) logic:**
```sql
-- Both should return the same department_id
SELECT department_id FROM departments WHERE LOWER(TRIM(department_name)) = LOWER(TRIM('Public Works Department'));
SELECT department_id FROM departments WHERE LOWER(TRIM(department_name)) = LOWER(TRIM('public works department'));
SELECT department_id FROM departments WHERE LOWER(TRIM(department_name)) = LOWER(TRIM('  PUBLIC WORKS DEPARTMENT  '));

-- All three should return: 9
```

---

## Success Criteria

✅ **All tests pass when:**

1. Test 1: Exact match complaint has `department_id = 9`
2. Test 2: Case-insensitive match complaint has `department_id = 9`
3. Test 3: Whitespace-trimmed match complaint has `department_id = 4`
4. Test 4: Unknown department returns error and complaint is deleted
5. Test 5: Inactive department returns error and complaint is deleted
6. All HTTP responses include proper error messages for failures
7. No silent NULL values in `department_id` field
8. Department names from AI are properly normalized before lookup

