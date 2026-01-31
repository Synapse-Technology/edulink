#!/bin/bash

# Test registration endpoint
echo "Testing registration endpoint..."

curl -X POST http://localhost:8000/api/auth/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teststudent@testuniversity.edu",
    "username": "teststudent",
    "password": "testpass123",
    "password_confirm": "testpass123",
    "first_name": "Test",
    "last_name": "Student",
    "phone_number": "+1234567890",
    "gender": "M",
    "role": "student",
    "registration_number": "TEST2024001"
  }' \
  -v

echo -e "\n\nRegistration test completed!"