# Frontend Integration Analysis Script (PowerShell)
# Save this as: Analyze-Frontend-Integration.ps1
# Run in your frontend workspace root directory: .\Analyze-Frontend-Integration.ps1

Write-Host "🔍 FRONTEND INTEGRATION ANALYSIS STARTING..." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Create output directory for results
if (!(Test-Path "integration-analysis-results")) {
    New-Item -ItemType Directory -Name "integration-analysis-results" | Out-Null
}
Set-Location "integration-analysis-results"

Write-Host ""
Write-Host "📡 1. FINDING ALL API ENDPOINTS CURRENTLY INTEGRATED..." -ForegroundColor Yellow
Write-Host "--------------------------------------------------------" -ForegroundColor Yellow

# Find API endpoints
$apiFiles = Get-ChildItem -Path "../src" -Recurse -Include "*.js","*.jsx","*.ts","*.tsx" -ErrorAction SilentlyContinue
$apiEndpoints = @()

foreach ($file in $apiFiles) {
    $content = Get-Content $file.FullName -ErrorAction SilentlyContinue
    $matches = $content | Select-String "api/" -AllMatches
    foreach ($match in $matches) {
        $apiEndpoints += $match.Line.Trim()
    }
}

$apiEndpoints | Sort-Object | Get-Unique | Out-File "api-endpoints-found.txt" -Encoding UTF8
Write-Host "✅ Results saved to: api-endpoints-found.txt" -ForegroundColor Green
Write-Host "Preview (first 10 lines):"
Get-Content "api-endpoints-found.txt" | Select-Object -First 10

Write-Host ""
Write-Host "🔐 2. CHECKING AUTHENTICATION IMPLEMENTATION..." -ForegroundColor Yellow
Write-Host "-----------------------------------------------" -ForegroundColor Yellow

# Find authentication patterns
$authPatterns = @()
foreach ($file in $apiFiles) {
    $content = Get-Content $file.FullName -ErrorAction SilentlyContinue
    $matches = $content | Select-String "Authorization|Bearer|token" -AllMatches
    foreach ($match in $matches) {
        $authPatterns += "$($file.Name): $($match.Line.Trim())"
    }
}

$authPatterns | Out-File "auth-implementation.txt" -Encoding UTF8
Write-Host "✅ Results saved to: auth-implementation.txt" -ForegroundColor Green
Write-Host "Preview (first 5 lines):"
Get-Content "auth-implementation.txt" | Select-Object -First 5

Write-Host ""
Write-Host "👤 3. FINDING ROLE-BASED UI COMPONENTS..." -ForegroundColor Yellow
Write-Host "------------------------------------------" -ForegroundColor Yellow

# Find role-based patterns
$rolePatterns = @()
foreach ($file in $apiFiles) {
    $content = Get-Content $file.FullName -ErrorAction SilentlyContinue
    $matches = $content | Select-String "role.*===|role.*==|hasRole|isAdmin|isFaculty|isStudent|role.*includes|role.*match" -AllMatches
    foreach ($match in $matches) {
        $rolePatterns += "$($file.Name): $($match.Line.Trim())"
    }
}

$rolePatterns | Out-File "role-based-components.txt" -Encoding UTF8
Write-Host "✅ Results saved to: role-based-components.txt" -ForegroundColor Green
Write-Host "Preview (first 5 lines):"
Get-Content "role-based-components.txt" | Select-Object -First 5

Write-Host ""
Write-Host "🛠️ 4. CHECKING API SERVICE FILES..." -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow

# Find API service files
$serviceFiles = Get-ChildItem -Path "../src" -Recurse -Include "*api*","*service*","*http*" -ErrorAction SilentlyContinue
$serviceFiles | ForEach-Object { $_.FullName } | Out-File "api-service-files.txt" -Encoding UTF8
Write-Host "✅ Results saved to: api-service-files.txt" -ForegroundColor Green
Write-Host "Found API service files:"
Get-Content "api-service-files.txt"

Write-Host ""
Write-Host "🎫 5. FINDING AUTHENTICATION CONTEXT..." -ForegroundColor Yellow
Write-Host "---------------------------------------" -ForegroundColor Yellow

# Find auth context patterns
$authContextPatterns = @()
foreach ($file in $apiFiles) {
    $content = Get-Content $file.FullName -ErrorAction SilentlyContinue
    $matches = $content | Select-String "AuthContext|useAuth|authStore|AuthProvider|createContext.*auth" -AllMatches
    foreach ($match in $matches) {
        $authContextPatterns += "$($file.Name): $($match.Line.Trim())"
    }
}

$authContextPatterns | Out-File "auth-context.txt" -Encoding UTF8
Write-Host "✅ Results saved to: auth-context.txt" -ForegroundColor Green
Write-Host "Preview (first 5 lines):"
Get-Content "auth-context.txt" | Select-Object -First 5

Write-Host ""
Write-Host "📋 6. ANALYZING COMMON FRONTEND PATTERNS..." -ForegroundColor Yellow
Write-Host "--------------------------------------------" -ForegroundColor Yellow

# Check for HTTP clients
$httpClients = @()
foreach ($file in $apiFiles) {
    $content = Get-Content $file.FullName -ErrorAction SilentlyContinue
    $matches = $content | Select-String "axios|fetch|XMLHttpRequest" -AllMatches
    foreach ($match in $matches) {
        $httpClients += "$($file.Name): $($match.Line.Trim())"
    }
}
$httpClients | Select-Object -First 10 | Out-File "http-clients.txt" -Encoding UTF8

# Generate summary
Write-Host ""
Write-Host "📊 7. GENERATING INTEGRATION SUMMARY..." -ForegroundColor Yellow
Write-Host "---------------------------------------" -ForegroundColor Yellow

$apiCount = (Get-Content "api-endpoints-found.txt" | Measure-Object -Line).Lines
$authCount = (Get-Content "auth-implementation.txt" | Measure-Object -Line).Lines
$roleCount = (Get-Content "role-based-components.txt" | Measure-Object -Line).Lines
$serviceCount = (Get-Content "api-service-files.txt" | Measure-Object -Line).Lines
$contextCount = (Get-Content "auth-context.txt" | Measure-Object -Line).Lines

$summary = @"
Integration Summary:
===================
API Endpoints Found: $apiCount
Authentication References: $authCount
Role-based Components: $roleCount
API Service Files: $serviceCount
Auth Context References: $contextCount

Unique API Endpoints:
"@

# Extract unique API endpoints
$uniqueEndpoints = Get-Content "api-endpoints-found.txt" | ForEach-Object { 
    if ($_ -match "api/([^'`"]*)" ) { 
        $matches[1] 
    } 
} | Sort-Object | Get-Unique

$summary += "`n" + ($uniqueEndpoints -join "`n")

$summary | Out-File "integration-summary.txt" -Encoding UTF8
Write-Host "✅ Complete summary saved to: integration-summary.txt" -ForegroundColor Green
Write-Host $summary

Write-Host ""
Write-Host "🎯 ANALYSIS COMPLETE!" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host "All results saved in: integration-analysis-results/" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review all generated files" -ForegroundColor White
Write-Host "2. Share the integration-summary.txt with the backend team" -ForegroundColor White
Write-Host "3. Compare findings with backend API inventory" -ForegroundColor White
Write-Host ""
Write-Host "Files created:" -ForegroundColor Cyan
Get-ChildItem | Select-Object Name, Length

Set-Location ".."
Write-Host "📁 Analysis complete! Check the integration-analysis-results/ directory" -ForegroundColor Green