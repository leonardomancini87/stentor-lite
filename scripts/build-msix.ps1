# Costruisce il pacchetto MSIX di Sténtor Lite per il Microsoft Store.
#
# Prima va compilata l'app senza installatori:   npx tauri build --no-bundle
# Poi:                                           pwsh scripts/build-msix.ps1
# Il pacchetto esce in src-tauri/target/release/msix/ e NON è firmato: lo firma Microsoft
# quando lo si carica in Partner Center. Per questo non si installa con un doppio clic.
#
# Servono makeappx.exe e makepri.exe del Windows SDK (già presenti sui computer di GitHub Actions).

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$conf = Get-Content (Join-Path $root 'src-tauri/tauri.conf.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$version = $conf.version
$release = Join-Path $root 'src-tauri/target/release'
$exe = Join-Path $release 'stentor.exe'
if (-not (Test-Path $exe)) { throw "Non trovo ${exe}: compila prima con 'npx tauri build --no-bundle'." }

function Find-SdkTool($name) {
  $tool = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin\*\x64' -Filter $name -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1
  if (-not $tool) { throw "Non trovo ${name}: installa il Windows SDK." }
  return $tool.FullName
}
$makeappx = Find-SdkTool 'makeappx.exe'
$makepri = Find-SdkTool 'makepri.exe'

$out = Join-Path $release 'msix'
$layout = Join-Path $out 'layout'
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $layout 'Assets') -Force | Out-Null

Copy-Item $exe $layout
Copy-Item (Join-Path $root 'src-tauri/windows/store/Assets/*') (Join-Path $layout 'Assets')

# Il manifesto va scritto in UTF-8 senza BOM, con la versione a quattro numeri (l'ultimo è sempre 0).
$manifestPath = Join-Path $root 'src-tauri/windows/store/AppxManifest.xml'
$manifest = [System.IO.File]::ReadAllText($manifestPath, [System.Text.Encoding]::UTF8)
$manifest = $manifest.Replace('__VERSION__', $version)
[System.IO.File]::WriteAllText((Join-Path $layout 'AppxManifest.xml'), $manifest, (New-Object System.Text.UTF8Encoding($false)))

# Indice delle risorse: serve perché Windows scelga l'icona giusta per ogni dimensione e scala.
$priConfig = Join-Path $out 'priconfig.xml'
& $makepri createconfig /cf $priConfig /dq en-US /o
if ($LASTEXITCODE -ne 0) { throw 'makepri createconfig non riuscito.' }
# Senza questo passaggio makepri dividerebbe le risorse in più file (uno per lingua e per scala),
# cosa che ha senso solo per i pacchetti multipli: qui serve un unico resources.pri.
[xml]$priXml = Get-Content $priConfig
$packaging = $priXml.SelectSingleNode('//packaging')
if ($packaging) { [void]$packaging.ParentNode.RemoveChild($packaging) }
$priXml.Save($priConfig)
& $makepri new /pr $layout /cf $priConfig /mn (Join-Path $layout 'AppxManifest.xml') /of (Join-Path $layout 'resources.pri') /o
if ($LASTEXITCODE -ne 0) { throw 'makepri new non riuscito.' }

$package = Join-Path $out "Stentor.Lite_${version}_x64.msix"
& $makeappx pack /d $layout /p $package /o
if ($LASTEXITCODE -ne 0) { throw 'makeappx pack non riuscito.' }

Write-Host "Pacchetto pronto: $package"
