# Test Add Person Modal

This file is for testing the new "Add a Person" modal functionality.

## Test Cases

1. **Add person to existing company**: Select an existing company from the dropdown
2. **Create new company**: Select "Create a new Company" option
3. **Form validation**: Test required field validation
4. **Company name generation**: Test how new company names are generated

## Expected Behavior

- Modal title should be "Add a Person"
- Fields should be (in order):
  - **Choose Company** (dropdown - at the top)
  - Full Name (placeholder: "John Smith")
  - Job Title (placeholder: "Dev Team Leader")
  - Department (placeholder: "Engineering")
  - Description (optional) (placeholder: "Add description here (optional)")
- Company dropdown should show:
  - "Create a new Company" as first option
  - List of existing companies by name (not file path)
- No "Definition file type" field should be visible
- Description field is optional and not required for form submission

## Validation Behavior

- **Inline Error Display**: Validation errors appear in a red error banner at the top of the modal
- **Error Messages**:
  - Empty full name: "⚠️ Please enter a full name"
  - No company selected: "⚠️ Please choose a company"
  - Save failures: "❌ Failed to add person. Please try again."
  - Company creation failures: "❌ Failed to get or create company file"
- **Button States**:
  - Normal: "Save" button enabled
  - Submitting: "Saving..." button disabled
  - After completion/error: Returns to "Save" enabled
- **Error Behavior**:
  - Errors appear with smooth animation
  - Previous errors are cleared when form is resubmitted
  - Error scrolls into view if needed

## Confirmation Dialogs

### Minimal Data Confirmation
- **Trigger**: When only Full Name is filled (Job Title, Department, and Description are all empty)
- **Modal Title**: "⚠️ Minimal Person Data"
- **Message**: Warns about creating a person with minimal information
- **Suggestion**: Recommends adding at least job title or department
- **Buttons**:
  - "Go Back" (muted style) - Returns to form
  - "Add Anyway" (warning style) - Proceeds with minimal data

### New Company Confirmation
- **Trigger**: When "Create a new company" is selected from dropdown
- **Modal Title**: "🏢 Create New Company"
- **Content**:
  - Explains what will happen (create file, use defaults, add person)
  - Lists next steps for customization
  - Mentions plugin settings → Company pages management
- **Buttons**:
  - "Cancel" (muted style) - Returns to form
  - "Create Company" (CTA style) - Proceeds with company creation

## Test Person Data

**Full Name**: Alice Johnson
**Job Title**: Senior Developer
**Department**: Engineering
**Description**: Experienced full-stack developer with expertise in React and Node.js. Leads the frontend architecture team and mentors junior developers.

This person should be added to test the modal functionality.
