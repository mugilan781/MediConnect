$files = @('about','services','doctors','appointments','consultations','lab-tests','sample-collection','reports','pricing','contact','faq')
foreach($f in $files) {
  Write-Output ""
  Write-Output "===== $f ====="
  $path = "c:\MUGILAN\MR Coderz Hub\Project 7\MediConnect\public\$f.html"
  $lines = Get-Content $path
  $inHero = $false
  $depth = 0
  foreach($line in $lines) {
    if($line -match 'SECTION 1.*HERO') { $inHero = $true; $depth = 0 }
    if($inHero) {
      Write-Output $line
      if($line -match '<section') { $depth++ }
      if($line -match '</section') { $depth--; if($depth -le 0) { $inHero = $false; break } }
    }
  }
}
