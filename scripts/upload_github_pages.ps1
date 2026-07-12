param(
  [string]$Owner = "qamerdarak-code",
  [string]$Repo = "Peterzhixue",
  [string]$Branch = "main",
  [string]$CustomDomain = "peterzhixue.tech"
)

$ErrorActionPreference = "Stop"

$token = $env:GITHUB_TOKEN
if (-not $token) {
  $token = [Environment]::GetEnvironmentVariable("GITHUB_TOKEN", "User")
}
if (-not $token) {
  throw "GITHUB_TOKEN is not set in process or User environment."
}
$token = $token.Trim()

$api = "https://api.github.com"
$headers = @{
  Authorization          = "Bearer $token"
  Accept                 = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
  "User-Agent"           = "Codex-Peterzhixue-Uploader"
}

function Invoke-GitHub {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null
  )

  $uri = "$api$Path"
  $json = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 20 -Compress } else { $null }
  $maxAttempts = 4

  for ($attempt = 1; $attempt -le $maxAttempts; $attempt += 1) {
    try {
      if ($null -eq $Body) {
        return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
      }
      return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $json -ContentType "application/json"
    } catch {
      $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { $null }
      if ($status -eq 401) {
        throw "GitHub token unauthorized (401). Token is invalid, expired, revoked, or not allowed for this repository. Create a new PAT with Contents read/write permission for $Owner/$Repo."
      }
      $retryable = ($null -eq $status) -or ($status -eq 429) -or ($status -ge 500 -and $status -le 599)
      if ($retryable -and $attempt -lt $maxAttempts) {
        $delaySeconds = [Math]::Pow(2, $attempt - 1)
        Write-Host "GitHub API temporary error ($status) for $Method $Path. Retry $attempt/$maxAttempts in $delaySeconds second(s)..."
        Start-Sleep -Seconds $delaySeconds
        continue
      }
      if ($retryable) {
        throw "GitHub request failed after $maxAttempts attempts: $Method $uri (HTTP $status)."
      }
      throw
    }
  }
}

function Try-GitHub {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null
  )

  try {
    return Invoke-GitHub -Method $Method -Path $Path -Body $Body
  } catch {
    $status = $null
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
    }
    if ($status -eq 404 -or $status -eq 409) {
      return $null
    }
    throw
  }
}

$repoInfo = Invoke-GitHub -Method GET -Path "/repos/$Owner/$Repo"
if ($repoInfo.default_branch) {
  $Branch = $repoInfo.default_branch
}

$files = @(
  "index.html",
  "styles.css",
  "app.js",
  "CNAME",
  ".nojekyll",
  ".gitignore",
  ".env.example",
  "README.md",
  "package.json",
  "vercel.json",
  "scripts/upload_github_pages.ps1",
  "public/questions.js",
  "public/pete-logo.png",
  "public/pete-avatar.jpg",
  "public/pete-lab.jpg",
  "public/pete-sport.jpg",
  "public/pete-dorm.jpg",
  "public/pete-boxing-real.jpg",
  "public/pete-boxing-real.mp4",
  "public/pete-boxing-wide.mp4",
  "public/chairman-zhou-pete.jpg",
  "public/statistics-map-dispersion.jpg",
  "public/statistics-map-normal.png",
  "public/statistics-map-rate.png",
  "public/pathology-2023-01.jpg",
  "public/pathology-2023-02.jpg",
  "public/pathology-2023-03.jpg",
  "public/pathology-2023-04.jpg",
  "public/pathology-2023-05.jpg",
  "public/pathology-2023-06.jpg",
  "public/pathology-2023-07.jpg",
  "public/pathology-2023-08.jpg",
  "public/pathology-2023-09.jpg",
  "public/pathology-2023-10.jpg",
  "public/pathology-2023-11.jpg",
  "public/pathology-2023-12.jpg",
  "public/pathology-2023-13.jpg",
  "public/pathology-2023-14.jpg",
  "public/pathology-2023-15.jpg",
  "public/pathology-2023-16.jpg",
  "public/pathology-2023-17.jpg",
  "scripts/build_site_data.py",
  "extracted/statistics-extra-questions.json",
  "extracted/xigai-choices.doc",
  "extracted/pathology-slides-2023.pdf",
  "extracted/病理A.pdf",
  "extracted/病理学2A.pdf",
  "extracted/病理学3A.pdf",
  "extracted/病理4A.pdf",
  "extracted/microbiology-300.pdf",
  "src/api-contract.json"
)

$files += Get-ChildItem -LiteralPath "public/icons" -File |
  Sort-Object Name |
  ForEach-Object { "public/icons/$($_.Name)" }

$workspaceRoot = (Get-Location).Path.TrimEnd("\") + "\"
$files += Get-ChildItem -LiteralPath "api", "server", "tests" -Recurse -File -Filter "*.js" |
  Sort-Object FullName |
  ForEach-Object {
    $_.FullName.Substring($workspaceRoot.Length).Replace("\", "/")
  }

$files = @($files | Where-Object {
  -not ($_ -like "extracted/*A.pdf" -and -not (Test-Path -LiteralPath $_))
})
$files += Get-ChildItem -LiteralPath "extracted" -Filter "*A.pdf" |
  Sort-Object Name |
  ForEach-Object { "extracted/$($_.Name)" }
$files = @($files | Select-Object -Unique)

$deleteFiles = @(
  "public/pathology-appendicitis.jpg",
  "public/pathology-pulmonary-edema.jpg",
  "public/pathology-fat-embolism.jpg",
  "public/pathology-colon-adenocarcinoma.jpg",
  "public/pathology-schistosomiasis-liver.jpg",
  "public/pathology-hydatidiform-mole.jpg",
  "public/pathology-signet-ring-node.jpg",
  "public/pathology-squamous-cell-carcinoma.jpg",
  "public/pathology-lobar-pneumonia.jpg",
  "public/pathology-cirrhosis.jpg",
  "public/pathology-thrombus-recanalization.jpg",
  "public/pathology-atherosclerosis.jpg",
  "public/pathology-gastric-ulcer.jpg",
  "public/pathology-lung-tuberculosis.jpg",
  "public/pathology-kidney-tuberculosis.jpg",
  "public/pathology-purulent-meningitis.jpg",
  "public/pathology-fatty-liver.jpg",
  "scripts/download_pathology_images.ps1",
  "extracted/pathology-slides.doc"
)

foreach ($file in $files) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Missing file: $file"
  }
  $repoPath = $file.Replace("\", "/")
  $bytes = [IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $file))
  $existing = Try-GitHub -Method GET -Path "/repos/$Owner/$Repo/contents/$repoPath"  
  $body = @{
    message = "Deploy $repoPath"
    content  = [Convert]::ToBase64String($bytes)
    branch = $Branch
  }
  if ($existing -and $existing.sha) {
    $body.sha = $existing.sha
  }
  Invoke-GitHub -Method PUT -Path "/repos/$Owner/$Repo/contents/$repoPath" -Body $body | Out-Null
}

$deletedFiles = 0
foreach ($file in $deleteFiles) {
  $repoPath = $file.Replace("\", "/")
  $existing = Try-GitHub -Method GET -Path "/repos/$Owner/$Repo/contents/$repoPath"
  if ($existing -and $existing.sha) {
    Invoke-GitHub -Method DELETE -Path "/repos/$Owner/$Repo/contents/$repoPath" -Body @{
      message = "Delete obsolete $repoPath"
      sha = $existing.sha
      branch = $Branch
    } | Out-Null
    $deletedFiles += 1
  }
}

$ref = Invoke-GitHub -Method GET -Path "/repos/$Owner/$Repo/git/ref/heads/$Branch"
$commitSha = $ref.object.sha

$pagesError = $null
$pages = Try-GitHub -Method GET -Path "/repos/$Owner/$Repo/pages"
try {
  if ($pages) {
    Invoke-GitHub -Method PUT -Path "/repos/$Owner/$Repo/pages" -Body @{
      cname = $CustomDomain
      source = @{
        branch = $Branch
        path   = "/"
      }
    } | Out-Null
  } else {
    Invoke-GitHub -Method POST -Path "/repos/$Owner/$Repo/pages" -Body @{
      source = @{
        branch = $Branch
        path   = "/"
      }
    } | Out-Null

    Invoke-GitHub -Method PUT -Path "/repos/$Owner/$Repo/pages" -Body @{
      cname = $CustomDomain
      source = @{
        branch = $Branch
        path   = "/"
      }
    } | Out-Null
  }
} catch {
  $pagesError = $_.Exception.Message
}

$pagesAfter = Try-GitHub -Method GET -Path "/repos/$Owner/$Repo/pages"

[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", $null, "User")

[pscustomobject]@{
  repo       = $repoInfo.full_name
  branch     = $Branch
  commitSha  = $commitSha
  commitUrl  = "https://github.com/$Owner/$Repo/commit/$commitSha"
  pagesUrl   = $pagesAfter.html_url
  customDomain = $pagesAfter.cname
  status     = $pagesAfter.status
  pagesUpdateError = $pagesError
  files      = $files.Count
  deletedFiles = $deletedFiles
  tokenClearedFromUserEnvironment = $true
} | ConvertTo-Json -Depth 5
