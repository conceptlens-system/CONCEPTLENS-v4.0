$files = Get-ChildItem -Recurse -File -Include *.py,*.tsx,*.ts,*.js,*.css,*.html
$results = @()
foreach ($file in $files) {
    if ($file.FullName -match "node_modules|\\.next|\\.git|__pycache__|venv") { continue }
    try {
        $lines = (Get-Content $file.FullName -ErrorAction SilentlyContinue | Measure-Object -Line).Lines
        if ($null -ne $lines) {
            $results += [PSCustomObject]@{
                Lines = $lines
                Path = $file.FullName
            }
        }
    } catch {}
}
$results | Sort-Object Lines -Descending | Select-Object -First 10 | ForEach-Object { "$($_.Lines) : $($_.Path)" }
