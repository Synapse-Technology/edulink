# Department API Documentation

## Overview

The Department API provides endpoints for managing academic departments within institutions. It supports standard CRUD operations (Create, Read, Update, Delete) with proper authentication and permission controls.

## Base URL

```
/api/institutions/departments/
```

## Authentication

All endpoints require authentication. Users must have a valid JWT token included in the Authorization header:

```
Authorization: Bearer <token>
```

## Permissions

Access to department endpoints is restricted based on user roles:

- **Institution Admins**: Can only access departments from their own institution
- **Superusers/Staff**: Can access all departments
- **Regular Users**: No access to departments

## Endpoints

### List Departments

**GET** `/api/institutions/departments/`

Returns a list of departments based on the user's permissions.

**Response**

```json
[
  {
    "id": 1,
    "institution": 1,
    "institution_name": "University of Nairobi",
    "name": "Computer Science",
    "code": "CS",
    "description": "Department of Computer Science",
    "head_of_department": "Dr. John Doe",
    "is_active": true,
    "created_at": "2023-01-01T12:00:00Z",
    "updated_at": "2023-01-01T12:00:00Z"
  },
  {
    "id": 2,
    "institution": 1,
    "institution_name": "University of Nairobi",
    "name": "Mathematics",
    "code": "MATH",
    "description": "Department of Mathematics",
    "head_of_department": "Dr. Jane Smith",
    "is_active": true,
    "created_at": "2023-01-01T12:00:00Z",
    "updated_at": "2023-01-01T12:00:00Z"
  }
]
```

### Retrieve Department

**GET** `/api/institutions/departments/{id}/`

Returns details for a specific department.

**Response**

```json
{
  "id": 1,
  "institution": 1,
  "institution_name": "University of Nairobi",
  "name": "Computer Science",
  "code": "CS",
  "description": "Department of Computer Science",
  "head_of_department": "Dr. John Doe",
  "is_active": true,
  "created_at": "2023-01-01T12:00:00Z",
  "updated_at": "2023-01-01T12:00:00Z"
}
```

### Create Department

**POST** `/api/institutions/departments/`

Creates a new department.

**Request Body**

```json
{
  "institution": 1,
  "name": "Physics",
  "code": "PHYS",
  "description": "Department of Physics",
  "head_of_department": "Dr. Albert Einstein",
  "is_active": true
}
```

**Response**

```json
{
  "id": 3,
  "institution": 1,
  "institution_name": "University of Nairobi",
  "name": "Physics",
  "code": "PHYS",
  "description": "Department of Physics",
  "head_of_department": "Dr. Albert Einstein",
  "is_active": true,
  "created_at": "2023-01-02T12:00:00Z",
  "updated_at": "2023-01-02T12:00:00Z"
}
```

### Update Department

**PUT/PATCH** `/api/institutions/departments/{id}/`

Updates an existing department. PUT requires all fields, while PATCH allows partial updates.

**Request Body (PATCH example)**

```json
{
  "head_of_department": "Dr. Marie Curie",
  "description": "Updated Department of Physics"
}
```

**Response**

```json
{
  "id": 3,
  "institution": 1,
  "institution_name": "University of Nairobi",
  "name": "Physics",
  "code": "PHYS",
  "description": "Updated Department of Physics",
  "head_of_department": "Dr. Marie Curie",
  "is_active": true,
  "created_at": "2023-01-02T12:00:00Z",
  "updated_at": "2023-01-02T14:00:00Z"
}
```

### Delete Department

**DELETE** `/api/institutions/departments/{id}/`

Deletes a department.

**Response**

```
204 No Content
```

## Security and Audit Logging

All department operations are logged for security and audit purposes:

- Creation, updates, and deletions are recorded in the audit log
- Security events are tracked with user information, IP address, and user agent
- Failed operations are logged with appropriate error details

## Error Responses

### Authentication Error

```json
{
  "error": "NotAuthenticated",
  "message": "Authentication credentials were not provided.",
  "details": {
    "detail": "Authentication credentials were not provided."
  }
}
```

### Permission Error

```json
{
  "error": "PermissionDenied",
  "message": "You do not have permission to perform this action.",
  "details": {
    "detail": "You do not have permission to perform this action."
  }
}
```

### Not Found Error

```json
{
  "error": "NotFound",
  "message": "Department not found.",
  "details": {
    "detail": "Not found."
  }
}
```