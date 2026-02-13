# Прямой тест GigaChat API (curl): токен + chat/completions
# Показывает, виноват сервис или наш код. Запуск: .\scripts\test-gigachat-direct.ps1

$envFile = Join-Path $PSScriptRoot ".." ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "Файл .env не найден. Создайте его из .env.example и укажите GIGACHAT_AUTH_KEY, GIGACHAT_SCOPE."
    exit 1
}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $val = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $val, 'Process')
    }
}

$authKey = $env:GIGACHAT_AUTH_KEY
$scope = $env:GIGACHAT_SCOPE
if (-not $authKey) { Write-Host "GIGACHAT_AUTH_KEY не задан в .env"; exit 1 }
if (-not $scope) { $scope = "GIGACHAT_API_PERS" }

$tokenUrl = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
$rqUID = [guid]::NewGuid().ToString()

Write-Host "=== 1. Получение токена ===" -ForegroundColor Cyan
$tokenResp = curl.exe -s -w "\n%{http_code}" -X POST $tokenUrl `
  -H "Content-Type: application/x-www-form-urlencoded" `
  -H "Accept: application/json" `
  -H "RqUID: $rqUID" `
  -H "Authorization: Basic $authKey" `
  -d "scope=$scope"

$tokenBody = ($tokenResp -split "`n")[0..($tokenResp.Split("`n").Count - 2)] -join "`n"
$tokenStatus = ($tokenResp -split "`n")[-1]
Write-Host "HTTP $tokenStatus"
if ($tokenStatus -ne "200") {
    Write-Host $tokenBody
    Write-Host "Ошибка: сервис GigaChat (OAuth) вернул не 200. Проверьте ключ и scope."
    exit 1
}

$tokenJson = $tokenBody | ConvertFrom-Json
$accessToken = $tokenJson.access_token
if (-not $accessToken) {
    Write-Host "В ответе нет access_token:" $tokenBody
    exit 1
}
Write-Host "Токен получен, длина: $($accessToken.Length)"

Write-Host "`n=== 2. Запрос chat/completions ===" -ForegroundColor Cyan
$chatUrl = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions"
$body = @{
    model = "GigaChat-2-Pro"
    messages = @(
        @{ role = "user"; content = "Ответь одним словом: привет" }
    )
    temperature = 0.3
    stream = $false
} | ConvertTo-Json -Depth 10 -Compress

$chatResp = curl.exe -s -w "\n%{http_code}" -X POST $chatUrl `
  -H "Content-Type: application/json" `
  -H "Accept: application/json" `
  -H "Authorization: Bearer $accessToken" `
  -d $body

$chatBody = ($chatResp -split "`n")[0..($chatResp.Split("`n").Count - 2)] -join "`n"
$chatStatus = ($chatResp -split "`n")[-1]
Write-Host "HTTP $chatStatus"
if ($chatStatus -eq "200") {
    $chatJson = $chatBody | ConvertFrom-Json
    $content = $chatJson.choices[0].message.content
    Write-Host "Ответ модели: $content"
    Write-Host "`nИтог: GigaChat API отвечает 200, сервис в порядке. Если у нас 500 — смотри наш код/роут."
} else {
    Write-Host $chatBody
    Write-Host "Итог: GigaChat API вернул $chatStatus — проблема на стороне сервиса или формата запроса (модель, body)."
}
