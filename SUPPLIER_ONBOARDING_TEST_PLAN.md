# Supplier Onboarding Flow - Test Plan & Summary

## Overview
This document outlines the supplier onboarding flow, including pre-filled data, locked fields, validation, and the multi-step process.

## Test Instructions

### 1. Run Tests in UI Mode
```bash
npm run test:e2e:ui
```

This will open the Playwright UI where you can run tests step-by-step and see what's happening.

### 2. Manual Testing Checklist

---

## Phase 1: Supplier Accepts Invitation

### Steps:
1. **Admin creates Buyer**
   - Login as admin@sdn.tech / Admin123!
   - Go to Admin → Buyers
   - Click "Add Buyer"
   - Fill in buyer details and save

2. **Buyer invites Supplier**
   - Login as the newly created buyer
   - Go to `/buyer/invitations`
   - Click "New Invite" button
   - Fill in:
     - Supplier Legal Name: `Test Supplier Co.`
     - Primary Contact Email: `supplier@test.com`
     - Business Type: `Enterprise`
     - Country: `United States`
   - Click "Send Invitation"
   - Copy the invite link from the success dialog

3. **Supplier accepts invite**
   - Navigate to the invite link (or `/auth/accept-invite?token=<token>`)
   - **Expected Results:**
     - ✅ "Company Legal Name" field is **pre-filled** with the name from invitation
     - ✅ "Email" field is **pre-filled** with supplier email
     - ✅ Pre-filled fields are **disabled (locked)** - cannot be edited
     - ✅ "Country" field is pre-filled with "United States"
     - ✅ "Business Type" is pre-filled with "Enterprise"
   - Fill password fields
   - Click "Complete Registration"
   - **Expected:** Redirected to `/supplier/dashboard`

---

## Phase 2: Multi-Step Onboarding Flow

### Section 1: Company Details (`/supplier/dashboard?section=company`)

**Location:** `/supplier/dashboard?section=company`

**Pre-filled Data:**
- ✅ Legal Name (from invitation)
- ✅ Country (from invitation)
- ✅ Business Type (from invitation)

**Editable Fields (before submission):**
- Website
- Description

**Validation:**
- Legal Name is required (pre-filled, locked)
- Country is required (pre-filled, can edit)

**Navigation:**
- Click "Next Step" → saves data and moves to Address section

---

### Section 2: Registered Address (`/supplier/dashboard?section=address`)

**Location:** `/supplier/dashboard?section=address`

**Pre-filled Data:**
- None (all fields empty initially)

**Required Fields:**
- Street Address
- City
- Postal Code

**Validation:**
- All 3 fields must be filled before "Next Step" button is enabled
- ✅ If fields empty, "Next Step" button is disabled

**Navigation:**
- Click "Next Step" → saves address and moves to Contact section

---

### Section 3: Contact Person (`/supplier/dashboard?section=contact`)

**Location:** `/supplier/dashboard?section=contact`

**Pre-filled Data:**
- ✅ Email is shown (from account, not editable here)

**Required Fields:**
- Full Name
- Position/Designation

**Editable Fields:**
- Full Name (e.g., "John Doe")
- Position (e.g., "Procurement Manager")

**Navigation:**
- Click "Next Step" → saves contact and moves to Tax section

---

### Section 4: Tax Information (`/supplier/dashboard?section=tax`)

**Location:** `/supplier/dashboard?section=tax`

**Country-Specific Validation:**

#### For United States:
- Required: **Tax ID (EIN)** - Format: XX-XXXXXXX
- Validation: Must be valid EIN format

#### For India:
- Required: **PAN** - 10 characters alphanumeric
- If "GST Registered" = "Yes":
  - Required: **GSTIN** - 15 characters

#### For Other Countries:
- Required: **Tax ID** - country-specific format

**Navigation:**
- Click "Next Step" → saves tax info and moves to Bank section

---

### Section 5: Bank Information (`/supplier/dashboard?section=bank`)

**Location:** `/supplier/dashboard?section=bank`

**Required Fields:**
- Bank Name
- Account Number
- Routing Number (or IFSC for India)

**Validation by Country:**

#### For United States:
- Routing Number: 9 digits (ACH routing)
- Format: #########

#### For India:
- IFSC Code: 11 characters
- Format: XXXX0XXXXXX (4 letters + 0 + 6 alphanumeric)

**Navigation:**
- Click "Next Step" → saves bank info and moves to Documents section

---

### Section 6: Documents (`/supplier/dashboard?section=documents`)

**Location:** `/supplier/dashboard?section=documents`

**Required Documents by Country:**

#### For United States:
- ✅ W-9 Form (upload required)
- ✅ Certificate of Incorporation (upload required)

#### For India:
- ✅ PAN Card (upload required)
- ✅ GST Certificate (upload required, if GST registered)

**Upload Process:**
1. Click "Choose File" or "Upload" button
2. Select file from computer
3. File uploads and shows status:
   - ⏳ "UPLOADING" (yellow)
   - ✅ "UPLOADED" (green)
   - ✅ "VERIFIED" (green check)

**Document Verification:**
- Documents need to be verified by buyer/admin
- Status updates from UPLOADED → VERIFIED
- Cannot submit profile until all required docs are UPLOADED

---

## Phase 3: Profile Submission

### Submit Profile Button

**Location:** Bottom of any dashboard page (after all sections complete)

**Conditions to Enable:**
1. ✅ Company section complete
2. ✅ Address section complete
3. ✅ Contact section complete
4. ✅ Tax section complete (with country-specific requirements)
5. ✅ Bank section complete
6. ✅ All required documents uploaded

**Submission Process:**
1. Click "Submit Profile" button
2. ✅ Success toast: "Profile submitted successfully!"
3. ✅ Supplier approval status changes to "SUBMITTED"
4. ✅ Submit button disappears

---

## Phase 4: After Submission - Fields Locked

### Locked Fields Behavior

**After submission, ALL fields become locked:**

#### Company Section:
- ❌ Legal Name - DISABLED (grayed out)
- ❌ Country - DISABLED (grayed out)
- ❌ Business Type - DISABLED (grayed out)
- ❌ Website - DISABLED
- ❌ Description - DISABLED
- ✅ Lock message appears: "Profile submitted - fields are locked"
- ✅ "Next Step" button replaced with "Next: Address" navigation button

#### Address Section:
- ❌ Street Address - DISABLED
- ❌ City - DISABLED
- ❌ Postal Code - DISABLED
- ✅ Can navigate to next section but cannot edit

#### Contact Section:
- ❌ Full Name - DISABLED
- ❌ Position - DISABLED
- ✅ Can navigate but cannot edit

#### Tax Section:
- ❌ All tax fields - DISABLED
- ❌ Cannot change tax information

#### Bank Section:
- ❌ All bank fields - DISABLED
- ❌ Cannot change bank information

#### Documents Section:
- ❌ Cannot upload new documents
- ❌ Cannot delete existing documents
- ✅ Can still view uploaded documents

---

## Data Persistence

### Across Sections:
- ✅ Data filled in one section persists when navigating to another section
- ✅ Data is saved to store (Zustand) and API
- ✅ On page reload, data is re-fetched from API and pre-filled

### Example:
1. Fill Website in Company section
2. Navigate to Address section
3. Navigate back to Company section
4. ✅ Website value is still there (persisted)

---

## Validation Rules Summary

| Section | Field | Validation Rule |
|---------|-------|-----------------|
| Company | Legal Name | Required, locked after invitation |
| Company | Country | Required |
| Address | Street | Required |
| Address | City | Required |
| Address | Postal Code | Required |
| Contact | Full Name | Required |
| Contact | Position | Required |
| Tax (US) | Tax ID/EIN | Required, format XX-XXXXXXX |
| Tax (India) | PAN | Required, 10 chars alphanumeric |
| Tax (India) | GSTIN | Required if GST Registered = Yes |
| Bank (US) | Routing Number | Required, 9 digits |
| Bank (India) | IFSC | Required, 11 chars, format XXXX0XXXXXX |
| Documents | All Required Docs | Must be UPLOADED before submit |

---

## Status Flow

```
INVITED → DRAFT → SUBMITTED → UNDER REVIEW → APPROVED
          ↓
      Can edit all sections
          ↓
      SUBMITTED (fields locked)
          ↓
      UNDER REVIEW (buyer reviews)
          ↓
      APPROVED (dashboard changes)
```

---

## Test Scenarios

### Scenario 1: Happy Path
1. ✅ Supplier accepts invite
2. ✅ All data pre-filled correctly
3. ✅ Complete each section step by step
4. ✅ All validations pass
5. ✅ Submit profile successfully
6. ✅ All fields locked after submission

### Scenario 2: Missing Required Fields
1. ✅ Try to skip required fields
2. ✅ "Next Step" button disabled
3. ✅ Validation error messages appear
4. ✅ Cannot submit until all required fields filled

### Scenario 3: Invalid Format
1. ✅ Enter invalid routing number (not 9 digits)
2. ✅ Enter invalid email format
3. ✅ Validation prevents saving
4. ✅ Error message shows

### Scenario 4: Data Persistence
1. ✅ Fill data in section
2. ✅ Navigate away
3. ✅ Navigate back
4. ✅ Data still present

### Scenario 5: Lock After Submit
1. ✅ Submit profile
2. ✅ Try to edit any field
3. ✅ All fields disabled (grayed out)
4. ✅ Cannot save changes
5. ✅ Only navigation buttons available

---

## API Endpoints Used

```javascript
// Get supplier details
GET /api/suppliers/:supplierId

// Update supplier
PUT /api/suppliers/:supplierId

// Create/Update address
POST /api/suppliers/:supplierId/addresses
PUT /api/addresses/:addressId

// Create/Update contact
POST /api/suppliers/:supplierId/contacts
PUT /api/contacts/:contactId

// Submit for review
POST /api/suppliers/:supplierId/reviews/submit

// Upload document
POST /api/suppliers/:supplierId/documents

// Get messages
GET /api/suppliers/:supplierId/messages
```

---

## Common Issues & Solutions

### Issue: Submit button not visible
**Solution:** Check that all sections are marked complete in the store

### Issue: Fields not locked after submission
**Solution:** Refresh page or check approvalStatus in auth store

### Issue: Validation not working
**Solution:** Ensure useEffect validation hooks are running in each section component

### Issue: Data not persisting
**Solution:** Check that API calls are succeeding (check Network tab)

---

## E2E Test File

The main E2E test file is: `e2e/supplier-onboarding-flow.spec.ts`

This contains 12 comprehensive tests covering:
1. Invite acceptance and pre-filled data
2. Company section verification
3. Address section validation
4. Contact section functionality
5. Tax section country-specific rules
6. Bank section validation
7. Document uploads
8. Profile submission
9. Field locking after submission
10. Navigation between sections
11. Data persistence
12. Validation error messages

---

## Running the Tests

```bash
# Run all tests in UI mode (interactive)
npm run test:e2e:ui

# Run all tests headless
npm run test:e2e

# Run specific test file
npm run test:e2e -- e2e/supplier-onboarding-flow.spec.ts

# Run with debug output
DEBUG=pw:* npm run test:e2e
```

---

## Success Criteria

✅ **Supplier can move through all sections** by clicking "Next Step"
✅ **Pre-filled data** from invitation is visible and correct
✅ **Locked fields** (legal name, country, email) cannot be edited
✅ **Validation** prevents saving incomplete data
✅ **Data persists** across navigation
✅ **All sections required** before submit button appears
✅ **Fields lock** after submission
✅ **Navigation works** between all sections
✅ **Country-specific rules** apply (US vs India)
✅ **Documents** must be uploaded before submit

---

## Next Steps

1. **Test with Playwright UI mode** to see the flow visually
2. **Test with different countries** (US vs India) to verify validation
3. **Test the rework/reject flow** to ensure suppliers can resubmit
4. **Test with multiple suppliers** to ensure no cross-contamination of data
5. **Performance testing** - ensure fast page loads and smooth navigation
