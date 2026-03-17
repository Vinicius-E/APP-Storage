param(
    [string]$IconPath = (Join-Path $PSScriptRoot "..\assets\icon.png"),
    [string]$FaviconPath = (Join-Path $PSScriptRoot "..\assets\favicon.png"),
    [string]$WebIconsDirectory = (Join-Path $PSScriptRoot "..\web\icons"),
    [int]$IconSize = 1024,
    [int]$FaviconSize = 256
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
    param(
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius
    )

    $diameter = [Math]::Min($Radius * 2, [Math]::Min($Width, $Height))
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-GradientBrush {
    param(
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [string]$StartColor,
        [string]$EndColor,
        [float]$Angle = 45
    )

    return New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        ([System.Drawing.RectangleF]::new($X, $Y, $Width, $Height)),
        ([System.Drawing.ColorTranslator]::FromHtml($StartColor)),
        ([System.Drawing.ColorTranslator]::FromHtml($EndColor)),
        $Angle
    )
}

function FillRoundedRect {
    param(
        [System.Drawing.Graphics]$Graphics,
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius,
        [System.Drawing.Brush]$Brush
    )

    $path = New-RoundedRectPath -X $X -Y $Y -Width $Width -Height $Height -Radius $Radius
    $Graphics.FillPath($Brush, $path)
    $path.Dispose()
}

function StrokeRoundedRect {
    param(
        [System.Drawing.Graphics]$Graphics,
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius,
        [System.Drawing.Pen]$Pen
    )

    $path = New-RoundedRectPath -X $X -Y $Y -Width $Width -Height $Height -Radius $Radius
    $Graphics.DrawPath($Pen, $path)
    $path.Dispose()
}

function Draw-SoftShadow {
    param(
        [System.Drawing.Graphics]$Graphics,
        [float]$X,
        [float]$Y,
        [float]$Width,
        [float]$Height,
        [float]$Radius,
        [float]$OffsetX,
        [float]$OffsetY,
        [int[]]$Opacities
    )

    for ($i = 0; $i -lt $Opacities.Length; $i++) {
        $spread = ($i + 1) * 4
        $path = New-RoundedRectPath -X ($X + $OffsetX - $spread / 2) `
            -Y ($Y + $OffsetY - $spread / 2) `
            -Width ($Width + $spread) `
            -Height ($Height + $spread) `
            -Radius ($Radius + ($spread / 2))
        $brush = New-Object System.Drawing.SolidBrush(
            [System.Drawing.Color]::FromArgb($Opacities[$i], 99, 58, 21)
        )
        $Graphics.FillPath($brush, $path)
        $brush.Dispose()
        $path.Dispose()
    }
}

function Draw-Cube {
    param(
        [System.Drawing.Graphics]$Graphics,
        [float]$X,
        [float]$Y,
        [float]$Size,
        [bool]$Highlighted,
        [int]$CanvasSize
    )

    $radius = $CanvasSize * 0.03
    $startColor = if ($Highlighted) { "#DDB07B" } else { "#B9722C" }
    $endColor = if ($Highlighted) { "#C9863E" } else { "#8D4F1A" }
    $brush = New-GradientBrush -X $X -Y $Y -Width $Size -Height $Size `
        -StartColor $startColor -EndColor $endColor -Angle 125
    FillRoundedRect -Graphics $Graphics -X $X -Y $Y -Width $Size -Height $Size -Radius $radius -Brush $brush
    $brush.Dispose()

    $highlightBrush = New-Object System.Drawing.SolidBrush(
        [System.Drawing.Color]::FromArgb(
            $(if ($Highlighted) { 86 } else { 64 }),
            255,
            246,
            236
        )
    )
    FillRoundedRect -Graphics $Graphics `
        -X ($X + $Size * 0.12) `
        -Y ($Y + $Size * 0.11) `
        -Width ($Size * 0.56) `
        -Height ($Size * 0.17) `
        -Radius ($CanvasSize * 0.012) `
        -Brush $highlightBrush
    $highlightBrush.Dispose()

    $cubePen = New-Object System.Drawing.Pen(
        [System.Drawing.Color]::FromArgb(
            $(if ($Highlighted) { 82 } else { 58 }),
            255,
            249,
            242
        ),
        ($CanvasSize * 0.0045)
    )
    StrokeRoundedRect -Graphics $Graphics -X $X -Y $Y -Width $Size -Height $Size -Radius $radius -Pen $cubePen
    $cubePen.Dispose()
}

function New-AppIconBitmap {
    param([int]$Size)

    $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#F5EDE3"))

    $backgroundBrush = New-GradientBrush -X 0 -Y 0 -Width $Size -Height $Size `
        -StartColor "#FDF8F2" -EndColor "#E8D8C6" -Angle 120
    FillRoundedRect -Graphics $graphics -X 0 -Y 0 -Width $Size -Height $Size -Radius ($Size * 0.22) -Brush $backgroundBrush
    $backgroundBrush.Dispose()

    $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(52, 255, 255, 255))
    $graphics.FillEllipse($glowBrush, $Size * 0.14, $Size * 0.08, $Size * 0.34, $Size * 0.22)
    $glowBrush.Dispose()

    $badgeSize = $Size * 0.7
    $badgeX = ($Size - $badgeSize) / 2
    $badgeY = ($Size - $badgeSize) / 2
    $badgeRadius = $Size * 0.17

    Draw-SoftShadow -Graphics $graphics -X $badgeX -Y $badgeY -Width $badgeSize -Height $badgeSize `
        -Radius $badgeRadius -OffsetX ($Size * 0.008) -OffsetY ($Size * 0.02) -Opacities @(16, 9)

    $badgeBrush = New-GradientBrush -X $badgeX -Y $badgeY -Width $badgeSize -Height $badgeSize `
        -StartColor "#FFF9F2" -EndColor "#F2E5D5" -Angle 120
    FillRoundedRect -Graphics $graphics -X $badgeX -Y $badgeY -Width $badgeSize -Height $badgeSize -Radius $badgeRadius -Brush $badgeBrush
    $badgeBrush.Dispose()

    $badgePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(44, 154, 91, 26), ($Size * 0.006))
    StrokeRoundedRect -Graphics $graphics -X $badgeX -Y $badgeY -Width $badgeSize -Height $badgeSize -Radius $badgeRadius -Pen $badgePen
    $badgePen.Dispose()

    $frameSize = $Size * 0.39
    $frameX = ($Size - $frameSize) / 2
    $frameY = ($Size - $frameSize) / 2
    $frameRadius = $Size * 0.07
    $frameThickness = $Size * 0.03

    $frameBrush = New-GradientBrush -X $frameX -Y $frameY -Width $frameSize -Height $frameSize `
        -StartColor "#A16122" -EndColor "#7F4515" -Angle 135
    FillRoundedRect -Graphics $graphics -X $frameX -Y $frameY -Width $frameSize -Height $frameSize -Radius $frameRadius -Brush $frameBrush
    $frameBrush.Dispose()

    $frameInnerX = $frameX + $frameThickness
    $frameInnerY = $frameY + $frameThickness
    $frameInnerSize = $frameSize - ($frameThickness * 2)
    $frameInnerRadius = [Math]::Max(0, $frameRadius - $frameThickness)

    $frameInnerBrush = New-GradientBrush -X $frameInnerX -Y $frameInnerY -Width $frameInnerSize -Height $frameInnerSize `
        -StartColor "#FAF0E4" -EndColor "#F4E7D8" -Angle 90
    FillRoundedRect -Graphics $graphics `
        -X $frameInnerX `
        -Y $frameInnerY `
        -Width $frameInnerSize `
        -Height $frameInnerSize `
        -Radius $frameInnerRadius `
        -Brush $frameInnerBrush
    $frameInnerBrush.Dispose()

    $gridGap = $Size * 0.038
    $cubeSize = $Size * 0.108
    $gridSize = ($cubeSize * 2) + $gridGap
    $gridX = ($Size - $gridSize) / 2
    $gridY = ($Size - $gridSize) / 2

    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(22, 112, 70, 28))
    FillRoundedRect -Graphics $graphics `
        -X ($gridX + $Size * 0.01) `
        -Y ($gridY + $Size * 0.016) `
        -Width ($gridSize - $Size * 0.02) `
        -Height ($gridSize - $Size * 0.02) `
        -Radius ($Size * 0.028) `
        -Brush $shadowBrush
    $shadowBrush.Dispose()

    Draw-Cube -Graphics $graphics -X $gridX -Y $gridY -Size $cubeSize -Highlighted $false -CanvasSize $Size
    Draw-Cube -Graphics $graphics -X ($gridX + $cubeSize + $gridGap) -Y $gridY -Size $cubeSize -Highlighted $true -CanvasSize $Size
    Draw-Cube -Graphics $graphics -X $gridX -Y ($gridY + $cubeSize + $gridGap) -Size $cubeSize -Highlighted $false -CanvasSize $Size
    Draw-Cube -Graphics $graphics -X ($gridX + $cubeSize + $gridGap) -Y ($gridY + $cubeSize + $gridGap) -Size $cubeSize -Highlighted $false -CanvasSize $Size

    $accentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(210, 212, 163, 115))
    FillRoundedRect -Graphics $graphics `
        -X ($frameX + $frameSize * 0.27) `
        -Y ($frameY + $frameSize * 0.09) `
        -Width ($frameSize * 0.46) `
        -Height ($Size * 0.017) `
        -Radius ($Size * 0.009) `
        -Brush $accentBrush
    $accentBrush.Dispose()

    $graphics.Dispose()
    return $bitmap
}

function Save-Bitmap {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [string]$Path
    )

    $directory = Split-Path -Parent $Path
    if (-not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory | Out-Null
    }

    $Bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Resize-Bitmap {
    param(
        [System.Drawing.Bitmap]$Bitmap,
        [int]$Size
    )

    $resized = New-Object System.Drawing.Bitmap $Size, $Size
    $graphics = [System.Drawing.Graphics]::FromImage($resized)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($Bitmap, 0, 0, $Size, $Size)
    $graphics.Dispose()
    return $resized
}

$resolvedIconPath = [System.IO.Path]::GetFullPath($IconPath)
$resolvedFaviconPath = [System.IO.Path]::GetFullPath($FaviconPath)
$resolvedWebIconsDirectory = [System.IO.Path]::GetFullPath($WebIconsDirectory)

$iconBitmap = New-AppIconBitmap -Size $IconSize
Save-Bitmap -Bitmap $iconBitmap -Path $resolvedIconPath

$faviconBitmap = Resize-Bitmap -Bitmap $iconBitmap -Size $FaviconSize
Save-Bitmap -Bitmap $faviconBitmap -Path $resolvedFaviconPath

$webIconSizes = [ordered]@{
    "favicon-16x16.png" = 16
    "favicon-32x32.png" = 32
    "icon-72x72.png" = 72
    "icon-96x96.png" = 96
    "icon-120x120.png" = 120
    "icon-128x128.png" = 128
    "icon-144x144.png" = 144
    "icon-152x152.png" = 152
    "icon-167x167.png" = 167
    "icon-180x180.png" = 180
    "icon-192x192.png" = 192
    "icon-256x256.png" = 256
    "icon-384x384.png" = 384
    "icon-512x512.png" = 512
    "icon-maskable-192x192.png" = 192
    "icon-maskable-512x512.png" = 512
}

foreach ($entry in $webIconSizes.GetEnumerator()) {
    $resizedBitmap = Resize-Bitmap -Bitmap $iconBitmap -Size $entry.Value
    Save-Bitmap -Bitmap $resizedBitmap -Path (Join-Path $resolvedWebIconsDirectory $entry.Key)
    $resizedBitmap.Dispose()
}

$faviconBitmap.Dispose()
$iconBitmap.Dispose()
