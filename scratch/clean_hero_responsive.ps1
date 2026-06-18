# Remove old hero-specific responsive rules from per-page CSS files
# These rules reference old class names that no longer exist in the HTML

$basePath = "c:\MUGILAN\MR Coderz Hub\Project 7\MediConnect\public\css"

$heroPatterns = @(
  '\.lab-hero',
  '\.sc-hero',
  '\.rpt-hero',
  '\.pricing-hero\s+(h1|p|\{)',
  '\.pricing-hero__',
  '\.contact-hero',
  '\.faq-hero\s+(h1|p|\{)',
  '\.faq-hero__stat',
  '\.appt-hero',
  '\.consult-hero__'
)

$files = @(
  "lab-tests.css",
  "sample-collection.css",
  "reports.css",
  "pricing.css",
  "contact.css",
  "faq.css",
  "appointments.css"
)

foreach ($fname in $files) {
  $file = "$basePath\$fname"
  $lines = Get-Content $file -Encoding UTF8
  $newLines = @()
  $skipUntilClose = $false
  $removed = 0

  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $shouldSkip = $false

    foreach ($pat in $heroPatterns) {
      if ($line -match $pat) {
        $shouldSkip = $true
        break
      }
    }

    if ($shouldSkip) {
      $removed++
      # If it's a one-liner with { and }, skip just this line
      if ($line -match '\{.*\}') {
        continue
      }
      # If it opens a block, skip until closing }
      if ($line -match '\{') {
        $skipUntilClose = $true
        continue
      }
      # Single-property line (already skipping)
      continue
    }

    if ($skipUntilClose) {
      if ($line -match '^\s*\}') {
        $skipUntilClose = $false
      }
      continue
    }

    $newLines += $line
  }

  $newLines | Out-File $file -Encoding UTF8
  Write-Output "${fname}: removed $removed hero-referencing lines"
}
