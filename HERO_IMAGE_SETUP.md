# Hero Image Setup Guide

## Quick Start

The Dive Log App README is configured to display a hero image at the top. This guide explains how to add your dive photo to the repository.

## Steps to Add the Hero Image

### 1. Resize Your Dive Photo

Resize your image to **1200x600 pixels** using one of these tools:

#### Online Tools (No Installation Needed)
- **Canva**: canva.com - Resize to custom 1200x600
- **Photopea**: photopea.com - Full Photoshop alternative
- **TinyPNG**: tinypng.com - Quick resize and optimize
- **Pixlr**: pixlr.com - Online image editor
- **Resize.cc**: resize-image.com - Simple and fast

#### Command Line (Advanced)

**Using ImageMagick (Linux/Mac/Windows)**:
```bash
convert input-dive-photo.jpg -resize 1200x600 -background white -gravity center -extent 1200x600 output.jpg
```

**Using ffmpeg**:
```bash
ffmpeg -i input-dive-photo.jpg -vf "scale=1200:600:force_original_aspect_ratio=decrease,pad=1200:600:(ow-iw)/2:(oh-ih)/2,format=yuv420p" assets/hero-dive.jpg
```

**Using Python PIL**:
```python
from PIL import Image
img = Image.open('dive-photo.jpg')
img_resized = img.resize((1200, 600), Image.Resampling.LANCZOS)
img_resized.save('assets/hero-dive.jpg', quality=85)
```

### 2. Export as JPG

- **Format**: JPG or JPEG
- **Quality**: 85-90% (good balance between size and quality)
- **Filename**: `hero-dive.jpg`

### 3. Upload to GitHub

#### Option A: GitHub Web Interface (Easiest)
1. Go to: https://github.com/opsabarsec/dive-log-app
2. Click "Add file" → "Upload files"
3. Drag and drop `hero-dive.jpg` into the `assets/` folder
4. Write commit message: "docs: Add hero dive image"
5. Click "Commit changes"

#### Option B: Git Command Line
```bash
# Clone the repo if you haven't already
git clone https://github.com/opsabarsec/dive-log-app.git
cd dive-log-app

# Copy your resized image
cp /path/to/hero-dive.jpg assets/

# Commit and push
git add assets/hero-dive.jpg
git commit -m "docs: Add hero dive image"
git push origin main
```

## Image Specifications

| Property | Value |
|----------|-------|
| **Dimensions** | 1200 x 600 pixels |
| **Aspect Ratio** | 2:1 (width:height) |
| **Format** | JPG/JPEG |
| **File Size** | < 500 KB recommended |
| **Quality** | 85-90% compression |
| **Color Space** | sRGB |

## Verification

Once uploaded:
1. Visit the repository main page
2. Scroll down to the README section
3. You should see your dive photo at the top of the README

## Troubleshooting

**Image not appearing?**
- Check filename is exactly `hero-dive.jpg`
- Ensure it's in the `assets/` folder
- Try refreshing the page (Ctrl+Shift+R or Cmd+Shift+R)
- GitHub may cache images; wait a few minutes if needed

**Image looks distorted?**
- Ensure aspect ratio is exactly 2:1 (1200x600)
- Resize using a proper image editor, not by stretching
- Try re-uploading with correct dimensions

**File size too large?**
- Use TinyPNG to compress while maintaining quality
- Try JPG quality 80-85% instead of 90%
- Consider cropping before resizing

## Current Status

📍 Hero image reference added to README: ✅
📁 Assets folder created: ✅
🖼️ Hero image file: ⏳ **Awaiting upload**

Once you upload `hero-dive.jpg`, the README will automatically display your dive photo!

---

For more details, see [`assets/README.md`](./assets/README.md)
