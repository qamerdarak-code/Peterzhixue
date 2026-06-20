$ErrorActionPreference = "Stop"

$items = @(
  @{
    Name = "pathology-appendicitis.jpg"
    Url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Acute%20Appendicitis%2C%20HE%201.jpg?width=960"
  },
  @{
    Name = "pathology-pulmonary-edema.jpg"
    Url = "https://pathology.or.jp/corepicturesEN/05/c01/images/04_m.jpg"
  },
  @{
    Name = "pathology-fat-embolism.jpg"
    Url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Histopathology%20of%20a%20pulmonary%20artery%20with%20fat%20embolism%20and%20a%20bone%20marrow%20fragment.jpg?width=960"
  },
  @{
    Name = "pathology-colon-adenocarcinoma.jpg"
    Url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Colorectal%20adenocarcinoma%20%282%29.jpg?width=960"
  },
  @{
    Name = "pathology-schistosomiasis-liver.jpg"
    Url = "https://pathology.or.jp/corepicturesEN/10/c06/images/02_m.jpg"
  },
  @{
    Name = "pathology-hydatidiform-mole.jpg"
    Url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Hydatidiform%20mole%20%281%29%20complete%20type.jpg?width=960"
  },
  @{
    Name = "pathology-signet-ring-node.jpg"
    Url = "https://patologia.cm.umk.pl/atlas/lymphatics/signet/img/large/2.jpg"
  },
  @{
    Name = "pathology-squamous-cell-carcinoma.jpg"
    Url = "https://pathology.or.jp/corepictures2010/20/c09/images/04_m.jpg"
  },
  @{
    Name = "pathology-lobar-pneumonia.jpg"
    Url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Lung%20biopsy%20showing%20lobar%20pneumonia%2010X.jpg?width=960"
  },
  @{
    Name = "pathology-cirrhosis.jpg"
    Url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Cirrhosis%20high%20mag.jpg?width=960"
  },
  @{
    Name = "pathology-thrombus-recanalization.jpg"
    Url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Complete%20organization%20of%20thromboembolus%20with%20recanalization.jpg?width=960"
  },
  @{
    Name = "pathology-atherosclerosis.jpg"
    Url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/RCA%20atherosclerosis.jpg?width=960"
  },
  @{
    Name = "pathology-gastric-ulcer.jpg"
    Url = "https://pathorama.ch/storage/samples/004977.jpg"
  },
  @{
    Name = "pathology-lung-tuberculosis.jpg"
    Url = "https://eliph.klinikum.uni-heidelberg.de/images/460t.jpg"
  },
  @{
    Name = "pathology-kidney-tuberculosis.jpg"
    Url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Tuberculous%20caseous%20granuloma%20%281%29%20TBLB.jpg?width=960"
  },
  @{
    Name = "pathology-purulent-meningitis.jpg"
    Url = "https://meddean.luc.edu/lumen/meded/orfpath/cns/mgmen4.jpg"
  },
  @{
    Name = "pathology-fatty-liver.jpg"
    Url = "https://commons.wikimedia.org/wiki/Special:Redirect/file/Fatty%20change%20liver%20-%20Lipid%20steatosis%2010X.jpg?width=960"
  }
)

$publicDir = Join-Path (Split-Path -Parent $PSScriptRoot) "public"
New-Item -ItemType Directory -Force -Path $publicDir | Out-Null

$headers = @{
  "User-Agent" = "Mozilla/5.0 PeterZhixue/1.0"
}

$results = foreach ($item in $items) {
  $target = Join-Path $publicDir $item.Name
  try {
    Invoke-WebRequest -Uri $item.Url -Headers $headers -OutFile $target -MaximumRedirection 5 -TimeoutSec 45
    $file = Get-Item -LiteralPath $target
    [PSCustomObject]@{
      name = $item.Name
      ok = $true
      bytes = $file.Length
      url = $item.Url
    }
  } catch {
    $existing = if (Test-Path -LiteralPath $target) { Get-Item -LiteralPath $target } else { $null }
    [PSCustomObject]@{
      name = $item.Name
      ok = $false
      error = $_.Exception.Message
      preserved = [bool]$existing
      bytes = if ($existing) { $existing.Length } else { 0 }
      url = $item.Url
    }
  }
}

$results | ConvertTo-Json -Depth 4
