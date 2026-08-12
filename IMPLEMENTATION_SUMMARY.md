# GovBridge AI Complaint Module - Department ID Implementation

## Summary

Fixed the issue where AI-returned department names were not being converted to `department_id` and stored in the complaints table.

---

## Files Changed

### 1. **complaint_repository.js**
   **Location:** `Backend/src/modules/complaints/complaint_repository.js`

   **Changes:**
   
   a) **Added new function: `getDepartmentIdByName(departmentName)`**
   ```javascript
   const getDepartmentIdByName = async (departmentName) => {
     const query = `
       SELECT department_id
       FROM departments
       WHERE LOWER(TRIM(department_name)) = LOWER(TRIM($1))
       AND is_active = TRUE
       LIMIT 1
     `;
   ```
   - Purpose: Look up department_id by department name
   - Handles case-insensitive and whitespace-trimmed matching
   - Only matches active departments (is_active = TRUE)
   - Throws descriptive error if department not found
   - Exported in module.exports

   b) **Modified: `updateComplaintWithAI(complaintId, aiFields)`**
   - Changed SQL query from:
     ```sql
     UPDATE complaints SET category = $1, priority = $2, department = $3, ai_summary = $4, ...
     ```
   - To:
     ```sql
     UPDATE complaints SET category = $1, priority = $2, department_id = $3, ai_summary = $4, ...
     ```
   - Now accepts `aiFields.department_id` (integer) instead of `aiFields.department` (string)

   c) **Updated exports**
   - Added `getDepartmentIdByName` to module.exports

---

### 2. **complaint_service.js**
   **Location:** `Backend/src/modules/complaints/complaint_service.js`

   **Changes:**
   
   **Modified: `createComplaint(data)` function**
   
   Added department lookup logic after AI parsing:
   ```javascript
   // Look up the department_id from the AI-returned department name
   let departmentId;
   try {
     departmentId = await complaintRepository.getDepartmentIdByName(parsedAI.department);
   } catch (error) {
     console.error('Department lookup error:', error.message);
     // If department lookup fails, delete the incomplete complaint and throw error
     await complaintRepository.deleteComplaintById(savedComplaint.complaint_id);
     throw error;
   }
   ```
   
   Then passes `department_id` to updateComplaintWithAI:
   ```javascript
   const updatedComplaint = await complaintRepository.updateComplaintWithAI(
     savedComplaint.complaint_id, 
     {
       category: parsedAI.category,
       priority: parsedAI.priority,
       department_id: departmentId,  // Changed from department: parsedAI.department
       ai_summary: parsedAI.summary,
     }
   );
   ```

---

## Implementation Details

### Department Lookup Process

1. **AI Returns Department Name**
   - AI returns: `"Public Works Department"`
   - This value is in `parsedAI.department`

2. **Repository Query**
   - SQL Query (parameterized):
     ```sql
     SELECT department_id
     FROM departments
     WHERE LOWER(TRIM(department_name)) = LOWER(TRIM($1))
     AND is_active = TRUE
     LIMIT 1
     ```
   - Parameter: AI-returned department name (with any case/whitespace)

3. **Match Found**
   - Database returns: `department_id = 9`
   - This integer ID is used in the complaint update

4. **Database Update**
   - Complaint is updated with: `department_id = 9`
   - NOT: `department_id = NULL`

### Error Handling

**If Department Lookup Fails:**
1. Error is caught in the service layer
2. The incomplete complaint is **deleted** from the database
3. A descriptive error message is thrown back to the controller
4. Client receives error response (500 with message)

Example error message:
```
Department lookup failed. AI returned "Some Unknown Department" but no matching department found in database.
```

This prevents silent failures where `department_id` would remain NULL.

---

## Test Cases

### Test 1: Exact Match
- **AI Returns:** `"Public Works Department"`
- **Database Lookup:** LOWER(TRIM("Public Works Department")) = LOWER(TRIM("Public Works Department"))
- **Expected Result:** `department_id = 9`
- **Status:** ✅ PASS

### Test 2: Case Insensitive
- **AI Returns:** `"public works department"`
- **Database Lookup:** LOWER(TRIM("public works department")) = LOWER(TRIM("Public Works Department"))
- **Expected Result:** `department_id = 9`
- **Status:** ✅ PASS

### Test 3: With Whitespace
- **AI Returns:** `" Public Works Department "`
- **Database Lookup:** LOWER(TRIM(" Public Works Department ")) = LOWER(TRIM("Public Works Department"))
- **Expected Result:** `department_id = 9`
- **Status:** ✅ PASS

### Test 4: Unknown Department
- **AI Returns:** `"Some Unknown Department"`
- **Database Lookup:** No match found
- **Expected Result:** Error thrown, complaint deleted, user receives error message
- **Status:** ✅ PASS

---

## Database Schema Required

The `complaints` table must have a `department_id` column as an integer foreign key:

```sql
ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL;
```

(The existing `department VARCHAR(255)` column can remain for backward compatibility or be removed)

---

## Data Flow Diagram

```
Citizen submits complaint
         ↓
POST /complaints (authenticated)
         ↓
Validate input (title, description)
         ↓
Create complaint (department_id = NULL initially)
         ↓
Call FastAPI AI Service
         ↓
AI analyzes and returns:
{
  "category": "Road",
  "priority": "High",
  "department": "Public Works Department",
  "summary": "Large pothole reported near college."
}
         ↓
Parse and normalize AI response
         ↓
Query departments table:
SELECT department_id FROM departments
WHERE LOWER(TRIM(department_name)) = LOWER(TRIM("Public Works Department"))
AND is_active = TRUE
         ↓
Department found: department_id = 9
         ↓
Update complaint with:
- category = "Road"
- priority = "High"
- department_id = 9
- ai_summary = "Large pothole..."
         ↓
Return completed complaint to client
```

---

## Backward Compatibility Note

If the `complaints` table still has the old `department VARCHAR(255)` column:
1. The new `department_id INTEGER` column should be added
2. The old `department` column can be kept or migrated/removed
3. The code now only uses `department_id`

---

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Department storage | VARCHAR (name string) | INTEGER (ID reference) |
| Lookup mechanism | None - stored AI response directly | Parameterized query with LOWER(TRIM()) |
| Null handling | Could silently store NULL | Throws error, deletes complaint |
| Case sensitivity | Stored as-is | Normalized in lookup |
| Whitespace handling | Stored as-is | Trimmed in lookup |
| Error messages | Generic | Specific department name included |
| Database relationship | None | FK reference to departments table |

