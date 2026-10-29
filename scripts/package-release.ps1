# Package clean submission ZIP with portable forward-slash paths and explicit directory entries
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$rootDir = $PSScriptRoot | Split-Path -Parent
$zipPath = Join-Path $rootDir "imovies-phase7-final-verified.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$excludedDirs = @(
    "node_modules",
    ".cache",
    "dist",
    "coverage",
    "test-results",
    "playwright-report",
    ".git"
)

$excludedExtensions = @(
    ".log",
    ".zip"
)

$allFiles = Get-ChildItem -Path $rootDir -Recurse -File -Force

$filesToZip = $allFiles | Where-Object {
    $fullPath = $_.FullName
    $relPath = $fullPath.Substring($rootDir.Length).TrimStart("\", "/")

    # Check excluded directory segments
    $skip = $false
    foreach ($seg in $relPath.Split([char[]]@('\', '/'))) {
        if ($excludedDirs -contains $seg) {
            $skip = $true
            break
        }
    }
    if ($skip) { return $false }

    # Check excluded file patterns
    if ($_.Name -eq ".env" -or $_.Name.StartsWith(".env.")) {
        if ($_.Name -ne ".env.example") {
            return $false
        }
    }

    if ($excludedExtensions -contains $_.Extension) {
        return $false
    }

    return $true
}

Write-Host "Packaging $($filesToZip.Count) files into $zipPath..."

$zipFile = [System.IO.File]::Open($zipPath, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($zipFile, [System.IO.Compression.ZipArchiveMode]::Create)

$createdDirs = New-Object 'System.Collections.Generic.HashSet[string]'

try {
    foreach ($file in $filesToZip) {
        $relPath = $file.FullName.Substring($rootDir.Length).TrimStart("\", "/").Replace("\", "/")
        $parts = $relPath.Split('/')
        
        # Ensure parent directories exist in archive
        $currentPath = "imovies-phase7-final-verified"
        if (!$createdDirs.Contains($currentPath)) {
            $null = $archive.CreateEntry($currentPath + "/")
            $null = $createdDirs.Add($currentPath)
        }
        for ($i = 0; $i -lt ($parts.Length - 1); $i++) {
            $currentPath += "/" + $parts[$i]
            if (!$createdDirs.Contains($currentPath)) {
                $null = $archive.CreateEntry($currentPath + "/")
                $null = $createdDirs.Add($currentPath)
            }
        }

        $entryName = "imovies-phase7-final-verified/" + $relPath
        $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
        $entryStream = $entry.Open()
        $fileStream = [System.IO.File]::OpenRead($file.FullName)
        try {
            $fileStream.CopyTo($entryStream)
        } finally {
            $fileStream.Dispose()
            $entryStream.Dispose()
        }
    }
} finally {
    $archive.Dispose()
    $zipFile.Dispose()
}

$zipInfo = Get-Item $zipPath
Write-Host "Success! Created $zipPath ($([math]::Round($zipInfo.Length / 1MB, 2)) MB)"
