# Тест нашего Next.js API: POST /api/ai/generate
# Запуск: сначала yarn dev, затем .\scripts\test-our-api.ps1

$base = "http://localhost:3000"
$url = "$base/api/ai/generate"

$body = @{
    topic = "тест"
    slidesCount = 2
    style = "professional"
    includeImages = $false
    language = "russian"
    audience = ""
} | ConvertTo-Json

Write-Host "=== Тест нашего API: POST $url ===" -ForegroundColor Cyan
try {
    $resp = Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 90
    Write-Host "HTTP $($resp.StatusCode)"
    Write-Host $resp.Content
    if ($resp.StatusCode -eq 200) {
        Write-Host "`nИтог: наш роут отвечает 200. Проблема не в нашем коде."
    }
} catch {
    $status = $null
    $errBody = $_.Exception.Message
    if ($_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            if ($stream) {
                $reader = New-Object System.IO.StreamReader($stream)
                $errBody = $reader.ReadToEnd()
                $reader.Close()
            }
        } catch { }
    }
    Write-Host "HTTP $status"
    Write-Host $errBody
    Write-Host "`nИтог: наш API вернул ошибку — смотри логи сервера (yarn dev) и роут app/api/ai/generate/route.ts"
}
