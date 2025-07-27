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
  - **Choose Company** (dropdown - at the top, default: "Choose one")
  - **Company Name** (appears only when "Create a new company" is selected)
  - Full Name (placeholder: "John Smith")
  - Job Title (placeholder: "Dev Team Leader")
  - Department (placeholder: "Engineering")
  - Description (optional) (placeholder: "Add description here (optional)")
- Company dropdown should show:
  - "Choose one" as default option (empty value)
  - "Create a new company" as second option
  - List of existing companies by name (not file path)
- No "Definition file type" field should be visible
- Description field is optional and not required for form submission

## Validation Behavior

- **Inline Error Display**: Validation errors appear in a red error banner at the top of the modal
- **Error Messages**:
  - Empty full name: "⚠️ Please enter a full name"
  - No company selected: "⚠️ You need to choose a company"
  - Empty company name (when creating new): "⚠️ Please enter a company name"
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
- **Trigger**: When "Create a new company" is selected and company name is provided
- **Modal Title**: "🏢 Create New Company"
- **Content**:
  - Shows the company name that will be created
  - Explains what will happen (create file, use defaults, add person)
  - Lists next steps for customization
  - Mentions plugin settings → Company pages management
- **Buttons**:
  - "Cancel" (muted style) - Returns to form
  - "Create Company" (CTA style) - Proceeds with company creation

## Dynamic Field Behavior

### Company Name Field
- **Visibility**: Hidden by default, appears only when "Create a new company" is selected
- **Behavior**:
  - Shows when dropdown changes to "Create a new company"
  - Hides when any other option is selected
  - Automatically focuses when shown
  - Value is cleared when hidden
- **Validation**: Required when creating new company
- **Real-time Validation**:
  - Validates on blur (when focus moves away from field)
  - Checks for existing company names (case-insensitive)
  - Shows immediate feedback below the field
  - Hides validation message while typing

### Company Name Validation Messages
- **Available Name**: "✅ '[Company Name]' is available." (green text)
- **Duplicate Name**: "⚠️ Company '[Company Name]' already exists. Please choose a different name." (red text)
- **Validation Timing**:
  - Appears when user tabs out or clicks away from company name field
  - Disappears when user starts typing again
  - Blocks form submission if company name already exists

## Debug Mode Testing

### Enabling Debug Mode
- **Settings**: Go to Settings → People Metadata → Core Setup → Debug mode (toggle on)
- **Commands**: Use Command Palette with context-aware commands:
  - "People Metadata: Enable debug mode (currently Off)" - Only appears when debug mode is off
  - "People Metadata: Disable debug mode (currently On)" - Only appears when debug mode is on
- **Confirmation**: Notice will show "People Metadata debug mode enabled" or "disabled"

### Debug Console Output
When debug mode is enabled, the browser console will show detailed logging:
- **Modal Opening**: "People-metadata: Opening Add Person modal"
- **Company Validation**: "People-metadata: Validating company name" with details
- **Person Creation**: "People-metadata: INFO: Starting person creation process" with form data
- **Company Creation**: "People-metadata: Creating new company file" with company name
- **Timing**: "People-metadata: TIMING: Person creation completed in XXms"
- **Errors**: "People-metadata: ERROR: [error details]" (always shown regardless of debug mode)

### Testing Debug Mode
1. Enable debug mode in settings
2. Open browser console (F12)
3. Use Add Person modal
4. Observe detailed logging with "People-metadata:" prefix
5. Disable debug mode and verify logging stops

## Test Person Data

**Full Name**: Alice Johnson
**Job Title**: Senior Developer
**Department**: Engineering
**Description**: Experienced full-stack developer with expertise in React and Node.js. Leads the frontend architecture team and mentors junior developers.

This person should be added to test the modal functionality.
