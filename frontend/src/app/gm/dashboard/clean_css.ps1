$c = Get-Content gm.css
$clean = $c[0..2558]
$clean | Set-Content gm.css -Encoding utf8
