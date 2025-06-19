# Test Add Person Modal

This file is for testing the new "Add a Person" modal functionality.

## Test Cases

1. **Add person to existing company**: Select an existing company from the dropdown
2. **Create new company**: Select "Create a new Company" option
3. **Form validation**: Test required field validation
4. **Company name generation**: Test how new company names are generated

## Expected Behavior

- Modal title should be "Add a Person"
- Fields should be:
  - Full Name (placeholder: "John Smith")
  - Job Title (placeholder: "Dev Team Leader") 
  - Department (placeholder: "Engineering")
  - Description (placeholder: "Add description here")
- Company dropdown should show:
  - "Create a new Company" as first option
  - List of existing companies by name (not file path)
- No "Definition file type" field should be visible

## Test Person Data

**Full Name**: Alice Johnson
**Job Title**: Senior Developer
**Department**: Engineering
**Description**: Experienced full-stack developer with expertise in React and Node.js. Leads the frontend architecture team and mentors junior developers.

This person should be added to test the modal functionality.
