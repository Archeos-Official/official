$headers = @{
    'Content-Type' = 'application/json'
}

# Test analyze worker with working image URL
$body = @{
    image_urls = @('https://httpbin.org/image/jpeg')
    action = 'scan'
    context = @{ material = 'unknown' }
} | ConvertTo-Json

Write-Host "Testing analyze-artifact worker..."

try {
    $response = Invoke-RestMethod -Uri 'https://analyze-artifact.teamarcheos.workers.dev' -Method Post -Headers $headers -Body $body -ErrorAction Stop
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_"
}