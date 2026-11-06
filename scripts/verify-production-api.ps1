# Attentra - Production API verification (Windows PowerShell 5.1+)
#
# Sends one chat completion to the production endpoint using the key in
# $env:ATTENTRA_API_KEY. Never prints the key (only its display prefix)
# and only ever sends it to the fixed production URL below.
#
# Usage:
#   $env:ATTENTRA_API_KEY = Read-Host "Enter your Attentra API key"
#   powershell -ExecutionPolicy Bypass -File scripts/verify-production-api.ps1

$ErrorActionPreference = "Stop"
$Endpoint = "https://attentra-nine.vercel.app/api/v1/chat/completions"

if (-not $env:ATTENTRA_API_KEY) {
    Write-Host "ATTENTRA_API_KEY is not set." -ForegroundColor Red
    exit 1
}

$key = $env:ATTENTRA_API_KEY.Trim().Trim('"').Trim("'")
$prefix = $key.Substring(0, [Math]::Min(10, $key.Length)) + "..."

Write-Host "Key prefix: $prefix  length: $($key.Length) (expected 68)"
if ($key -cnotmatch '^atr_[0-9a-f]{64}$') {
    Write-Host "Key does not match atr_<64 lowercase hex>. Copy the full key shown once at creation." -ForegroundColor Yellow
    exit 1
}

$body = @{
    model    = "auto"
    messages = @(@{ role = "user"; content = "Hello, are you working?" })
} | ConvertTo-Json -Depth 5

$status = $null
$raw = $null
$mitigated = $null

try {
    $response = Invoke-WebRequest -Method Post -Uri $Endpoint -UseBasicParsing `
        -Headers @{ Authorization = "Bearer $key" } `
        -ContentType "application/json" -Body $body -TimeoutSec 120
    $status = [int]$response.StatusCode
    $raw = $response.Content
} catch [System.Net.WebException] {
    if ($null -eq $_.Exception.Response) {
        Write-Host "Network error: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
    $status = [int]$_.Exception.Response.StatusCode
    $mitigated = $_.Exception.Response.Headers["X-Vercel-Mitigated"]
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $raw = $reader.ReadToEnd()
}

Write-Host "HTTP status: $status"

if ($mitigated) {
    Write-Host "BLOCKED by the Vercel Firewall ($mitigated) - the request never reached Attentra." -ForegroundColor Red
    Write-Host "Check Vercel > Project > Firewall (Attack Challenge Mode / Bot Protection / custom rules) for /api/v1."
    exit 2
}

try {
    $json = $raw | ConvertFrom-Json
} catch {
    Write-Host "Non-JSON response:" -ForegroundColor Yellow
    Write-Host $raw
    exit 1
}

Write-Host "requestId:   $($json.requestId)"

if ($status -eq 200 -and $json.success -and $json.content) {
    Write-Host "PASS - authenticated and received a completion" -ForegroundColor Green
    Write-Host "Provider:    $($json.execution.provider)"
    Write-Host "Model:       $($json.execution.modelIdentifier)"
    Write-Host "Latency ms:  $($json.execution.latencyMs)"
    Write-Host "Content:     $($json.content)"
    Write-Host "Next: confirm 'Last used' on the key and the request in Dashboard > History."
    exit 0
}

Write-Host "FAIL - $($json.error.code): $($json.error.message)" -ForegroundColor Red
if ($status -eq 401) {
    Write-Host "Find requestId $($json.requestId) in Vercel > Logs ('[chat-completions] Authentication rejected.') for the reason and dbHost."
}
exit 1
