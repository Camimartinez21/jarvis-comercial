# Prepara a Áurea en el PC de Cami (Windows). Equivale a deploy/arranque.sh de la nube.
# Se puede correr las veces que haga falta:
# 1) Copia lo que manda Cami (personalidad, reglas, skills, herramientas).
# 2) Siembra una sola vez lo que escribe la agente (pendientes, lecciones, memoria).
# 3) Crea los trabajos programados una sola vez.
# No toca el archivo .env de Hermes (ahí van las llaves y solo las pone Cami).
$ErrorActionPreference = "Stop"

$Origen  = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Datos   = if ($env:HERMES_HOME) { $env:HERMES_HOME } else { "C:\Users\HP\Aurea" }
$Trabajo = Join-Path $Datos "jarvis"

New-Item -ItemType Directory -Force -Path $Trabajo, (Join-Path $Datos "memories") | Out-Null

# 1) Archivos que solo cambia Cami: se reemplazan cada vez.
Copy-Item (Join-Path $Origen "deploy\pc\config.yaml") (Join-Path $Datos "config.yaml") -Force
Copy-Item (Join-Path $Origen "SOUL.md") (Join-Path $Datos "SOUL.md") -Force
foreach ($f in "AGENTS.md", "SOUL.md", "TOOLS.md", "USER.md") {
    Copy-Item (Join-Path $Origen $f) (Join-Path $Trabajo $f) -Force
}
foreach ($d in "skills", "bin", "jobs") {
    $destino = Join-Path $Trabajo $d
    if (Test-Path $destino) { Remove-Item $destino -Recurse -Force }
    Copy-Item (Join-Path $Origen $d) $destino -Recurse -Force
}
Get-ChildItem (Join-Path $Trabajo "bin") -Filter "__pycache__" -Directory -Recurse | Remove-Item -Recurse -Force
# Hermes no lee TOOLS.md: va al final de AGENTS.md.
$tools = Get-Content (Join-Path $Origen "TOOLS.md") -Encoding UTF8 | Select-Object -Skip 1
$utf8 = New-Object System.Text.UTF8Encoding($false)
[IO.File]::AppendAllText((Join-Path $Trabajo "AGENTS.md"), "`n## Tools`n`n" + ($tools -join "`n") + "`n", $utf8)

# 2) Lo que escribe la agente: solo si todavía no existe.
foreach ($f in "TASKS.md", "LESSONS.md", "HEARTBEAT.md", "MEMORY.md") {
    $p = Join-Path $Trabajo $f
    if (-not (Test-Path $p)) { Copy-Item (Join-Path $Origen $f) $p }
}
foreach ($d in "memory\topics", "drafts", "tasks\archive", "proposals\skills", "skills-learned", "logs") {
    New-Item -ItemType Directory -Force -Path (Join-Path $Trabajo $d) | Out-Null
}
Get-ChildItem (Join-Path $Origen "memory\topics") -Filter *.md | ForEach-Object {
    $p = Join-Path $Trabajo "memory\topics\$($_.Name)"
    if (-not (Test-Path $p)) { Copy-Item $_.FullName $p }
}
foreach ($f in "USER.md", "MEMORY.md") {
    $p = Join-Path $Datos "memories\$f"
    if (-not (Test-Path $p)) { Copy-Item (Join-Path $Origen $f) $p }
}
if (-not (Test-Path (Join-Path $Trabajo ".git"))) {
    git -C $Trabajo init -q
    git -C $Trabajo config user.name "agente"
    git -C $Trabajo config user.email "agente@localhost"
}

# 3) Trabajos programados (hora de Chile), una sola vez.
$marca = Join-Path $Datos ".trabajos-creados"
if (-not (Test-Path $marca)) {
    $D = "telegram"
    $tasks = ($Trabajo -replace '\\', '/') + "/TASKS.md"
    $trabajos = @(
        @("7 8 * * 1-5",          "Usa la skill jornada-comercial y ejecuta la jornada de hoy.", "jornada-comercial"),
        @("13 10,13,16 * * 1-5",  "Corre la skill autopilot sobre $tasks. Si no cambió nada, responde solo [SILENT].", "autopilot"),
        @("7 18 * * 1-5",         "Usa la skill cierre-del-dia, sección lunes a viernes 18:07.", "cierre-del-dia"),
        @("7 9 * * 1",            "Usa la skill cierre-del-dia, sección lunes 09:07: avance contra metas.", "cierre-del-dia"),
        @("37 19 * * 0",          "Corre bin/learn.sh weekly y usa la skill weekly-review. Resume en 5 líneas.", "weekly-review")
    )
    $ok = $true
    foreach ($t in $trabajos) {
        hermes cron create $t[0] $t[1] --skill $t[2] --deliver $D
        if ($LASTEXITCODE -ne 0) { $ok = $false; break }
    }
    if ($ok) { New-Item -ItemType File -Path $marca | Out-Null }
    else { Write-Warning "No se pudieron crear los trabajos programados; revisar con: hermes cron list" }
}

Write-Host "Áurea lista en $Trabajo"
