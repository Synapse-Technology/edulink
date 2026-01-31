# Test registration endpoint
Write-Host "Testing registration endpoint..."

$body = @{
    email = "teststudent2@testuniversity.edu"
    username = "teststudent2"
    password = "testpass123"
    password_confirm = "testpass123"
    first_name = "Test"
    last_name = "Student"
    phone_number = "+1234567890"
    gender = "M"
    role = "student"
    registration_number = "TEST2024002"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/users/register/" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Registration successful!"
    Write-Host ($response | ConvertTo-Json -Depth 10)
} catch {
    Write-Host "Registration failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}

Write-Host "`nRegistration test completed!"