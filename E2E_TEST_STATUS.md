# Supplier Onboarding E2E Test - Instructions

## Quick Start

Run the test in UI mode to see the flow step-by-step:

```bash
npm run test:e2e:ui
```

Then select: `e2e/supplier-complete-flow.spec.ts`

## What the Test Verifies

### ✅ Working Tests

1. **supplier-full-e2e.spec.ts** - 19 tests passing
   - Admin creates buyer
   - Buyer invites supplier
   - Supplier accepts invite
   - Supplier completes onboarding
   - Buyer approves through all steps

### 🎯 What Gets Tested in the Complete Flow

1. **Setup Phase**
   - ✅ Creates buyer account
   - ✅ Creates supplier invitation
   - ✅ Supplier accepts invite with pre-filled data

2. **Onboarding Steps** (with "Next" button clicks)
   - ✅ STEP 1: Company Details
   - ✅ STEP 2: Address
   - ✅ STEP 3: Contact Person
   - ✅ STEP 4: Tax Details
   - ✅ STEP 5: Bank Details
   - ✅ STEP 6: Documents
   - ✅ STEP 7: Submit Profile

3. **Post-Submission**
   - ✅ All fields become locked
   - ✅ Navigation still works
   - ✅ Status changes to SUBMITTED

## Manual Testing Checklist

Use this to manually verify the flow:

### 1. Supplier Invitation Acceptance
- [ ] Company name is pre-filled
- [ ] Email is pre-filled
- [ ] Country is pre-filled
- [ ] Set password
- [ ] Click "Complete Registration"
- [ ] Redirected to dashboard

### 2. STEP 1: Company Details
- [ ] Section loads (title visible)
- [ ] Legal Name shows pre-filled value
- [ ] Country shows pre-filled value
- [ ] Website field is editable
- [ ] Description field is editable
- [ ] Click "Next Step" → saves and moves to Address

### 3. STEP 2: Address
- [ ] Section loads
- [ ] Street Address field present
- [ ] City field present
- [ ] Postal Code field present
- [ ] Fill all three fields
- [ ] Click "Next Step" → saves and moves to Contact

### 4. STEP 3: Contact Person
- [ ] Section loads
- [ ] Full Name field present
- [ ] Position field present
- [ ] Fill both fields
- [ ] Click "Next Step" → saves and moves to Tax

### 5. STEP 4: Tax Details
- [ ] Section loads
- [ ] Tax ID/EIN field present
- [ ] Fill Tax ID
- [ ] Click "Next Step" → saves and moves to Bank

### 6. STEP 5: Bank Details
- [ ] Section loads
- [ ] Bank Name field present
- [ ] Account Number field present
- [ ] Routing Number field present
- [ ] Fill all fields
- [ ] Click "Next Step" → saves and moves to Documents

### 7. STEP 6: Documents
- [ ] Section loads
- [ ] Upload buttons visible
- [ ] Required documents listed (W-9, Certificate of Incorporation for US)
- [ ] Can upload files

### 8. STEP 7: Submit Profile
- [ ] All sections completed
- [ ] "Submit Profile" button appears at bottom
- [ ] Click "Submit Profile"
- [ ] Success toast appears
- [ ] Status changes to SUBMITTED

### 9. POST-SUBMISSION VERIFICATION
- [ ] All fields become disabled (grayed out)
- [ ] "Profile submitted - fields are locked" message appears
- [ ] "Next Step" buttons replaced with navigation buttons
- [ ] Can still navigate between sections
- [ ] Cannot edit any data

## Known Issues

1. **Auth Injection in E2E**: The Playwright tests have difficulty injecting auth state for suppliers
   - **Workaround**: The `supplier-full-e2e.spec.ts` tests work by using API calls alongside UI
   - **Status**: 19/21 tests passing

2. **Field Locators**: Some fields have dynamic labels that are hard to select
   - **Workaround**: Use placeholder text or multiple selector strategies
   - **Status**: Improved selectors in place

## Current Test Status

```
✓ supplier-full-e2e.spec.ts
  - 19 tests passing
  - 2 tests skipped (workflow dependent)
  - Covers: Full happy path, approvals, role switching

⚠ supplier-complete-flow.spec.ts
  - Single comprehensive test
  - Tests all steps in one flow
  - Status: Auth injection issues (use UI mode to debug)

○ supplier-step-by-step.spec.ts
  - Multi-test approach
  - Status: Variable sharing issues between tests
```

## Recommendation

**For best results:**

1. Use `npm run test:e2e:ui` to open the Playwright UI
2. Run `supplier-full-e2e.spec.ts` - these tests work reliably
3. Use the supplier dashboard manually to verify the flow
4. Check screenshots in `test-results/` for any failing tests

## Test Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `e2e/supplier-full-e2e.spec.ts` | Comprehensive multi-test suite | ✅ 19 passing |
| `e2e/supplier-complete-flow.spec.ts` | Single test through entire flow | ⚠️ Auth issues |
| `e2e/supplier-step-by-step.spec.ts` | Step-by-step individual tests | ⚠️ Variable sharing |
| `e2e/supplier-onboarding-flow.spec.ts` | Detailed flow tests | ⚠️ Complex setup |
