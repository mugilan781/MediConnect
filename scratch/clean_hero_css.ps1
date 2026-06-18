# Clean hero sections from remaining CSS files
# For each file, read it, find where Section 2 starts, and replace everything before it

$basePath = "c:\MUGILAN\MR Coderz Hub\Project 7\MediConnect\public\css"

# lab-tests.css: hero is lines 7-135, keep from line 137
$file = "$basePath\lab-tests.css"
$lines = Get-Content $file -Encoding UTF8
$header = @(
  "/* ============================================================",
  "   MediConnect - lab-tests.css",
  "   Premium Diagnostics Lab Tests Page",
  "   10-Section Layout",
  "   ============================================================ */",
  "",
  "/* -- Section 1: Hero (layout handled by .page-hero in components.css) -- */",
  ""
)
# Find line starting with "/* -- Section 2"
$idx = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match 'Section 2') { $idx = $i; break }
}
$rest = $lines[$idx..($lines.Count - 1)]
$newContent = $header + $rest
$newContent | Out-File $file -Encoding UTF8
Write-Output "lab-tests.css: removed hero (kept from line $idx)"

# sample-collection.css
$file = "$basePath\sample-collection.css"
$lines = Get-Content $file -Encoding UTF8
$header = @(
  "/* ============================================================",
  "   MediConnect - sample-collection.css",
  "   Premium Home Sample Collection Page",
  "   10-Section Layout",
  "   ============================================================ */",
  "",
  "/* -- Section 1: Hero (layout handled by .page-hero in components.css) -- */",
  ""
)
$idx = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match 'Section 2') { $idx = $i; break }
}
$rest = $lines[$idx..($lines.Count - 1)]
$newContent = $header + $rest
$newContent | Out-File $file -Encoding UTF8
Write-Output "sample-collection.css: removed hero (kept from line $idx)"

# reports.css
$file = "$basePath\reports.css"
$lines = Get-Content $file -Encoding UTF8
$header = @(
  "/* ============================================================",
  "   MediConnect - reports.css",
  "   Premium Medical Reports Page",
  "   10-Section Layout",
  "   ============================================================ */",
  "",
  "/* -- Section 1: Hero (layout handled by .page-hero in components.css) -- */",
  ""
)
$idx = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match 'Section 2') { $idx = $i; break }
}
$rest = $lines[$idx..($lines.Count - 1)]
$newContent = $header + $rest
$newContent | Out-File $file -Encoding UTF8
Write-Output "reports.css: removed hero (kept from line $idx)"

# pricing.css
$file = "$basePath\pricing.css"
$lines = Get-Content $file -Encoding UTF8
$header = @(
  "/* ============================================================",
  "   MediConnect - pricing.css",
  "   Premium Pricing Page",
  "   ============================================================ */",
  "",
  "/* -- Section 1: Hero (layout handled by .page-hero in components.css) -- */",
  ""
)
$idx = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match 'Section 2') { $idx = $i; break }
}
$rest = $lines[$idx..($lines.Count - 1)]
$newContent = $header + $rest
$newContent | Out-File $file -Encoding UTF8
Write-Output "pricing.css: removed hero (kept from line $idx)"

# contact.css
$file = "$basePath\contact.css"
$lines = Get-Content $file -Encoding UTF8
$header = @(
  "/* ============================================================",
  "   MediConnect - contact.css",
  "   Premium Contact Page",
  "   ============================================================ */",
  "",
  "/* -- Section 1: Hero (layout handled by .page-hero in components.css) -- */",
  ""
)
$idx = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match 'Section 2') { $idx = $i; break }
}
$rest = $lines[$idx..($lines.Count - 1)]
$newContent = $header + $rest
$newContent | Out-File $file -Encoding UTF8
Write-Output "contact.css: removed hero (kept from line $idx)"

# faq.css
$file = "$basePath\faq.css"
$lines = Get-Content $file -Encoding UTF8
$header = @(
  "/* ============================================================",
  "   MediConnect - faq.css",
  "   Premium FAQ / Help Center Page",
  "   ============================================================ */",
  "",
  "/* -- Section 1: Hero (layout handled by .page-hero in components.css) -- */",
  "/* Page-specific: search box styles kept below */",
  ""
)
# For FAQ, we need to find Section 2 but KEEP the search styles
# The search styles are .faq-hero__search which are page-specific
$idx = 0
$searchLines = @()
$inSearch = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match '\.faq-hero__search') { $inSearch = $true }
  if ($inSearch) {
    $searchLines += $lines[$i]
    if ($lines[$i] -match '^\}' -and $inSearch) { $inSearch = $false }
  }
  if ($lines[$i] -match 'Section 2') { $idx = $i; break }
}
$rest = $lines[$idx..($lines.Count - 1)]
$newContent = $header + $searchLines + @("") + $rest
$newContent | Out-File $file -Encoding UTF8
Write-Output "faq.css: removed hero (kept search + from line $idx)"
