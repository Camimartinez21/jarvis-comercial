# Abre el Centro de Comando de Áurea. Enciende lo que falte (Áurea y la página) y abre la ventana.
$ErrorActionPreference = "SilentlyContinue"
$Home_  = "C:\Users\HP\Aurea"
$Centro = Split-Path -Parent $MyInvocation.MyCommand.Path
$Node   = Join-Path $Home_ "tools\node-26.12.1-win32-x64\node.exe"
$Edge   = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

function Responde($url) {
  try { (Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2).StatusCode -eq 200 } catch { $false }
}

# 1) Áurea (Hermes): una sola copia. Si ya responde, no se toca.
if (-not (Responde "http://127.0.0.1:8642/health")) {
  $env:HERMES_HOME = $Home_
  Start-Process -FilePath (Join-Path $Home_ "bin\hermes.exe") -ArgumentList "gateway","run" -WorkingDirectory $Home_ -WindowStyle Hidden
}

# 2) La página del Centro.
if (-not (Responde "http://127.0.0.1:7879/api/estado")) {
  Start-Process -FilePath $Node -ArgumentList "`"$Centro\server.mjs`"" -WorkingDirectory $Centro -WindowStyle Hidden
  for ($i = 0; $i -lt 30 -and -not (Responde "http://127.0.0.1:7879/api/estado"); $i++) { Start-Sleep -Milliseconds 500 }
}

# 3) La ventana, sin barras de navegador.
Start-Process -FilePath $Edge -ArgumentList "--app=http://127.0.0.1:7879/", "--window-size=1366,768"
