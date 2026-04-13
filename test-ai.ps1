$headers = @{
    'Authorization' = 'Bearer cfut_WS2J372BIQpzpCiyTG3gChdyVWnSZ1mozJXp1lz6a754da42'
    'Content-Type' = 'application/json'
}

$body = @{
    stream = $false
    prompt = "What do you see in this image? Describe the object."
    max_tokens = 500
    image = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcHBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIhwcHCfoKIinANERENDh4nICorKS8wNw=="
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri 'https://api.cloudflare.com/client/v4/accounts/a0aea21f8b422b03ea28d79829060046/ai/run/@cf/meta/llama-3.2-11b-vision-instruct' -Method Post -Headers $headers -Body $body

$response | ConvertTo-Json -Depth 5