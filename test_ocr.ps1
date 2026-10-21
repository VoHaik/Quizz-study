Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Ocr.OcrEngine, Windows.Foundation.Diagnostics, ContentType = WindowsRuntime] | Out-Null
$langs = [Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages
foreach ($l in $langs) {
    Write-Output $l.LanguageTag
}
