# Bulk Upload Users Feature

## Overview
This feature allows administrators to upload multiple users at once using a CSV file. The system will automatically generate usernames, passwords, and IDs for each user, and send login credentials via email.

## Features Implemented

### Backend (Django)
- **New API Endpoint**: `/api/admin/users/bulk-upload/`
- **File Validation**: Checks for CSV format and required columns
- **Data Validation**: Validates email format, roles, and date formats
- **Duplicate Prevention**: Checks for existing users with same email
- **Automatic ID Generation**: Generates appropriate IDs based on user role
- **Email Sending**: Sends login credentials to each created user
- **Error Handling**: Provides detailed error messages for failed uploads
- **Batch Processing**: Processes multiple users in a single request

### Frontend (Next.js)
- **Bulk Upload Button**: Added next to the "Add User" button
- **File Upload Modal**: User-friendly interface for CSV upload
- **Sample CSV Download**: Provides template for users
- **Progress Feedback**: Shows upload status and results
- **Error Display**: Shows detailed error messages for failed rows
- **Success Summary**: Displays successfully created users

## CSV File Format

### Required Columns
- **Name**: Full name of the user
- **Email**: Official email address (must be unique)
- **Role**: User role (student, faculty, counselor, clinic, admin)
- **Grade**: Grade level (for students only)
- **Section**: Section (for students only)
- **Date of Birth**: Date in YYYY-MM-DD format (optional)

### Sample CSV Content
```csv
Name,Email,Role,Grade,Section,Date of Birth
John Doe,john.doe@amieti.com,student,Grade 10,A,2005-03-15
Jane Smith,jane.smith@amieti.com,faculty,,,1980-07-22
Mike Johnson,mike.johnson@amieti.com,counselor,,,1975-11-08
```

## How It Works

1. **Admin clicks "Bulk Upload" button** in the User Management page
2. **Modal opens** with instructions and file upload option
3. **Admin selects CSV file** or downloads sample template
4. **System validates** the file format and required columns
5. **For each row in CSV**:
   - Validates data (email format, role, etc.)
   - Checks for existing users
   - Generates username and password
   - Creates user account with appropriate ID
   - Sends email with login credentials
6. **Results displayed** showing success/error counts and details
7. **User list refreshes** to show newly created users

## Error Handling

The system provides detailed error reporting:
- **File format errors**: Invalid CSV format
- **Missing columns**: Required columns not found
- **Data validation errors**: Invalid email, role, or date format
- **Duplicate users**: Users with existing email addresses
- **Email sending failures**: Credentials not sent (user still created)

## Security Features

- **Admin-only access**: Only admin users can perform bulk uploads
- **File type validation**: Only CSV files accepted
- **Data sanitization**: Input data is cleaned and validated
- **Duplicate prevention**: Prevents creation of duplicate accounts
- **Secure password generation**: Random passwords for each user

## Files Modified

### Backend
- `backend/website/views.py`: Added `AdminBulkUploadUsersView` class
- `backend/backend/urls.py`: Added bulk upload endpoint

### Frontend
- `frontend/src/app/admin/users/page.jsx`: Added bulk upload UI and functionality

### Sample Data
- `datasets/sample_users_bulk_upload.csv`: Sample CSV file for testing

## Usage Instructions

1. Navigate to Admin → User Management
2. Click the "Bulk Upload" button (blue button next to "Add User")
3. Download the sample CSV file to see the required format
4. Prepare your CSV file with user data
5. Upload the CSV file
6. Review the results and any error messages
7. Close the modal when done

## Notes

- All users created via bulk upload will receive email notifications with their login credentials
- The system automatically generates appropriate IDs based on user roles
- Failed rows are reported but don't prevent successful uploads from other rows
- The feature maintains the same security and validation as individual user creation
