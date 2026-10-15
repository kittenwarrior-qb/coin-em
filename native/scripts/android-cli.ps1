[CmdletBinding()]
param(
  [ValidateSet('Inspect', 'Prepare', 'Install', 'Create', 'Start')]
  [string]$Action = 'Inspect',
  [string]$ArchivePath = '',
  [string]$SdkRoot = 'D:\Android\EmCoinSdk',
  [string]$JavaRoot = 'C:\Program Files\Android\Android Studio\jbr'
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$toolFolder = 'emcoin-15859902'
$archiveHash = '90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a'
$avdName = 'EmCoin_API36'
$image = 'system-images;android-36;google_apis;x86_64'

function Assert-SafeDirectory([string]$Path) {
  if (-not [IO.Path]::IsPathRooted($Path)) { throw 'Use an absolute SDK path.' }
  $resolved = [IO.Path]::GetFullPath($Path).TrimEnd('\')
  if ($resolved -eq [IO.Path]::GetPathRoot($resolved).TrimEnd('\')) { throw 'A drive root is not an SDK directory.' }
  $cursor = $resolved
  while ($cursor) {
    if (Test-Path -LiteralPath $cursor) {
      $item = Get-Item -LiteralPath $cursor -Force
      if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'SDK paths through junctions/symlinks are refused.' }
    }
    $parent = [IO.Path]::GetDirectoryName($cursor)
    if ($parent -eq $cursor) { break }
    $cursor = $parent
  }
  return $resolved
}
function Run-Tool([string]$Program, [string[]]$ToolArgs) {
  & $Program @ToolArgs
  if ($LASTEXITCODE -ne 0) { throw "Tool did not complete successfully: $([IO.Path]::GetFileName($Program)) (exit $LASTEXITCODE)." }
}
function Require-Interactive {
  if ([Console]::IsInputRedirected) { throw 'Run this action yourself in an interactive terminal; license prompts must not be automated.' }
}
$SdkRoot = Assert-SafeDirectory $SdkRoot
$java = Join-Path $JavaRoot 'bin\java.exe'
if (-not (Test-Path -LiteralPath $java -PathType Leaf)) { throw 'JDK21 is missing; supply -JavaRoot for your installation.' }
$oldPreference = $ErrorActionPreference
try {
  # Windows PowerShell5 treats normal native stderr as error records; java writes its version there.
  $ErrorActionPreference = 'Continue'
  $javaVersion = & $java -version 2>&1 | Out-String
  $javaExit = $LASTEXITCODE
} finally { $ErrorActionPreference = $oldPreference }
if ($javaExit -ne 0 -or $javaVersion -notmatch 'version "21\.') { throw 'Use JDK21, not a different JAVA_HOME version.' }
# Process-local settings only. No setx, machine PATH edits or global Java changes.
$env:JAVA_HOME = $JavaRoot
$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot
$env:ANDROID_AVD_HOME = Assert-SafeDirectory (Join-Path $SdkRoot 'avd')
$tools = Assert-SafeDirectory (Join-Path $SdkRoot "cmdline-tools\$toolFolder")
$sdkmanager = Join-Path $tools 'bin\sdkmanager.bat'
$avdmanager = Join-Path $tools 'bin\avdmanager.bat'
$emulator = Join-Path $SdkRoot 'emulator\emulator.exe'

if ($Action -eq 'Inspect') {
  [ordered]@{ sdkRoot = $SdkRoot; java21 = $true; commandLineTools = (Test-Path -LiteralPath $sdkmanager);
    emulator = (Test-Path -LiteralPath $emulator); licenseRecord = (Test-Path -LiteralPath (Join-Path $SdkRoot 'licenses\android-sdk-license'));
    installedByThisAction = $false; licensesAcceptedByScript = $false } | ConvertTo-Json
  exit 0
}
if ($Action -eq 'Prepare') {
  if (-not $ArchivePath) { throw 'First download the Windows command-line tools ZIP yourself from https://developer.android.com/studio#command-line-tools-only after reviewing its terms. Supply -ArchivePath.' }
  if (-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)) { throw 'The provided ZIP does not exist.' }
  if ((Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $archiveHash) { throw 'ZIP SHA256 differs from the reviewed Google release. Nothing extracted; review a new release before changing the pinned hash.' }
  if (Test-Path -LiteralPath $tools) { throw 'This tool version already exists; use Inspect/Install. It will not be overwritten.' }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $ArchivePath).Path)
  try {
    foreach ($entry in $archive.Entries) {
      $name = $entry.FullName.Replace('\', '/')
      if (-not $name.StartsWith('cmdline-tools/') -or $name -match '(^|/)\.\.(/|$)|:|^/' ) { throw 'Unsafe archive entry.' }
      $target = [IO.Path]::GetFullPath((Join-Path $tools $name.Substring('cmdline-tools/'.Length)))
      if ($target -ne $tools -and -not $target.StartsWith($tools + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Archive target escapes its SDK directory.' }
    }
    New-Item -ItemType Directory -Path $tools | Out-Null
    foreach ($entry in $archive.Entries) {
      $name = $entry.FullName.Replace('\', '/').Substring('cmdline-tools/'.Length)
      if (-not $name) { continue }
      $target = Join-Path $tools $name
      if ($entry.FullName.EndsWith('/')) { New-Item -ItemType Directory -Path $target -Force | Out-Null }
      else {
        New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($target)) -Force | Out-Null
        [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $false)
      }
    }
  } finally { $archive.Dispose() }
  if (-not (Test-Path -LiteralPath $sdkmanager)) { throw 'SDK manager not found in extracted archive.' }
  Write-Host "Verified tools prepared at $tools. No SDK license accepted and no packages installed."
  exit 0
}
if (-not (Test-Path -LiteralPath $sdkmanager)) { throw 'Run Prepare with the manually downloaded ZIP first.' }
if ($Action -eq 'Install') {
  Require-Interactive
  Write-Host 'Read each package agreement yourself. Choose n or Ctrl+C if you do not accept; this script never answers prompts.'
  Run-Tool $sdkmanager @("--sdk_root=$SdkRoot", '--install', 'platform-tools', 'platforms;android-36', 'build-tools;36.0.0', 'emulator', $image)
  Write-Host 'Package installation completed. This does not prove emulator acceleration, APK build or device tests.'
  exit 0
}
if (-not (Test-Path -LiteralPath $emulator)) { throw 'Install the emulator package first.' }
Run-Tool $emulator @('-accel-check')
if ($Action -eq 'Create') {
  Require-Interactive
  if (-not (Test-Path -LiteralPath $env:ANDROID_AVD_HOME)) { New-Item -ItemType Directory -Path $env:ANDROID_AVD_HOME | Out-Null }
  $existing = & $emulator -list-avds
  if ($LASTEXITCODE -ne 0) { throw 'Could not list existing AVDs.' }
  if ($existing -contains $avdName) { throw 'EmCoin_API36 already exists; it will not be replaced or wiped.' }
  Write-Host 'Creating a separate EmCoin_API36 AVD. At the custom hardware prompt you can choose no.'
  Run-Tool $avdmanager @('create', 'avd', '--name', $avdName, '--package', $image)
  exit 0
}
if ($Action -eq 'Start') {
  $existing = & $emulator -list-avds
  if ($LASTEXITCODE -ne 0 -or $existing -notcontains $avdName) { throw 'Create the dedicated EmCoin_API36 AVD first.' }
  # Explicit user-run action opens the visible interactive device; never wipes user data.
  Run-Tool $emulator @('-avd', $avdName, '-no-snapshot-load', '-no-snapshot-save', '-memory', '2048')
}
