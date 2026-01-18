# Assets

This directory contains media assets for the Dive Log App repository.

## Hero Image

### `hero-dive.jpg`

The main hero image displayed at the top of the README.md file.

**Specifications:**
- **Size**: 1200x600 pixels (recommended for GitHub)
- **Format**: JPG/JPEG
- **Description**: Underwater dive photography featuring divers performing the buddy check

### How to Add the Hero Image

1. Resize your dive photo to 1200x600 pixels using an image editor:
   - **Online tools**: TinyPNG, Canva, Photopea
   - **Command line**: `ffmpeg` or `ImageMagick`
   - **Local software**: GIMP, Photoshop, Preview (Mac)

2. Save the resized image as `hero-dive.jpg` in this directory

3. The image will automatically appear in the README at the top

### Command Line Example

Using ImageMagick to resize:
```bash
convert dive-photo.jpg -resize 1200x600 -background white -gravity center -extent 1200x600 assets/hero-dive.jpg
```

Using ffmpeg:
```bash
ffmpeg -i dive-photo.jpg -vf "scale=1200:600:force_original_aspect_ratio=decrease,pad=1200:600:(ow-iw)/2:(oh-ih)/2" assets/hero-dive.jpg
```

## Image Guidelines

- **JPG Quality**: 85-90% for good balance between quality and file size
- **File Size**: Ideally under 500KB for fast loading
- **Aspect Ratio**: 2:1 (width to height) for optimal display on GitHub
- **Content**: High-quality underwater photography with good lighting

## Future Assets

Other image assets can be added as needed:
- Screenshots of the application
- Feature icons
- Architecture diagrams
