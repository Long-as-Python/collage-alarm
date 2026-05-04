# Test backend connectivity
Write-Host "Testing Backend API..." -ForegroundColor Cyan

# Check if port 5000 is listening
Write-Host "`n1. Checking if port 5000 is listening..."
$port = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($port) {
    Write-Host "   ✓ Port 5000 is listening" -ForegroundColor Green
} else {
    Write-Host "   ✗ Port 5000 is NOT listening - Backend may not be running!" -ForegroundColor Red
}

# Try to connect to the backend
Write-Host "`n2. Attempting to connect to http://localhost:5000/api/auth/verify..."
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/verify" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "   ✓ Backend is reachable!" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Yellow
} catch {
    Write-Host "   ✗ Backend is NOT reachable" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Try admin login with wrong password (to verify it's working)
Write-Host "`n3. Testing admin login endpoint..."
try {
    $body = @{password = "wrong"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/admin-login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 3 `
        -ErrorAction Stop
    Write-Host "   ✓ Admin login endpoint works!" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Yellow
} catch {
    Write-Host "   ✗ Admin login failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" -ForegroundColor Cyan
Write-Host "=== Troubleshooting ===" -ForegroundColor Cyan
Write-Host "If port 5000 is NOT listening:" -ForegroundColor Yellow
Write-Host "  1. Open Terminal 1"
Write-Host "  2. cd backend"
Write-Host "  3. cmake --build build --config Debug"
Write-Host "  4. .\build\Debug\collage-alarm.exe"
Write-Host ""
Write-Host "If you see an error about address already in use:" -ForegroundColor Yellow
Write-Host "  powershell -Command `"Stop-Process -Force -ErrorAction SilentlyContinue -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess`""
