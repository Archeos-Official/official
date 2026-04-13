$headers = @{
    'Content-Type' = 'application/json'
}

# Use the actual Supabase URL from your frontend
$body = @{
    image_urls = @('https://kooxgauxbvsontylfoyv.supabase.co/storage/v1/object/public/discoveries/anonymous/1776090975907_r3czpycnv.jpg')
    action = 'scan'
    context = @{}
} | ConvertTo-Json

Write-Host "Testing with real artifact image..."
Write-Host "Image URL: https://kooxgauxbvsontylfoyv.supabase.co/storage/v1/object/public/discoveries/anonymous/1776090975907_r3czpycnv.jpg"

try {
    $response = Invoke-RestMethod -Uri 'https://analyze-artifact.teamarcheos.workers.dev' -Method Post -Headers $headers -Body $body -ErrorAction Stop -TimeoutSec 30
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_"
    $_.Exception.Response
}