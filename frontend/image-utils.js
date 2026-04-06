/**
 * image-utils.js - Image Processing Utilities
 * 
 * Handles image compression and EXIF orientation for mobile photo uploads.
 * Mobile photos are often 5-15MB and need compression to stay under Vercel's 4.5MB limit.
 */

/**
 * Get EXIF orientation from image file
 * Mobile cameras store rotation info in EXIF that needs to be applied during compression
 * 
 * @param {File} file - Image file
 * @returns {Promise<number>} - EXIF orientation (1-8, or 1 if not found)
 *   1 = normal, 6 = 90° rotate right (portrait), 8 = 90° rotate left, 3 = 180°
 */
function getExifOrientation(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const view = new DataView(e.target.result);
      if (view.getUint16(0, false) !== 0xFFD8) {
        resolve(1);
        return;
      }
      const length = view.byteLength;
      let offset = 2;
      while (offset < length) {
        const marker = view.getUint16(offset, false);
        offset += 2;
        if (marker === 0xFFE1) { // EXIF marker
          if (view.getUint32(offset += 2, false) !== 0x45786966) {
            resolve(1);
            return;
          }
          const little = view.getUint16(offset += 6, false) === 0x4949;
          offset += view.getUint32(offset + 4, little);
          const tags = view.getUint16(offset, little);
          offset += 2;
          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + i * 12, little) === 0x0112) {
              resolve(view.getUint16(offset + i * 12 + 8, little));
              return;
            }
          }
        } else if ((marker & 0xFF00) !== 0xFF00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }
      resolve(1);
    };
    reader.onerror = () => resolve(1);
    reader.readAsArrayBuffer(file.slice(0, 64 * 1024));
  });
}

/**
 * Compress an image file to reduce size for upload
 * Handles EXIF orientation from mobile cameras to ensure photos display correctly
 * 
 * @param {File} file - Original image file
 * @param {number} maxWidth - Maximum width in pixels (default 1920)
 * @param {number} quality - JPEG quality 0-1 (default 0.85)
 * @returns {Promise<File>} - Compressed file with .jpg extension
 */
async function compressImage(file, maxWidth = 1920, quality = 0.85) {
  return new Promise(async (resolve, reject) => {
    // Skip compression for small files (< 1MB)
    if (file.size < 1024 * 1024) {
      resolve(file);
      return;
    }

    // Get EXIF orientation for proper rotation handling
    const orientation = await getExifOrientation(file);

    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let { width, height } = img;
      
      // Handle orientation that swaps dimensions (90° or 270° rotations)
      if (orientation > 4) {
        [width, height] = [height, width];
      }
      
      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Apply EXIF orientation transforms
      ctx.save();
      switch (orientation) {
        case 2: ctx.translate(width, 0); ctx.scale(-1, 1); break; // flip horizontal
        case 3: ctx.translate(width, height); ctx.rotate(Math.PI); break; // 180°
        case 4: ctx.translate(0, height); ctx.scale(1, -1); break; // flip vertical
        case 5: ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1); break; // flip horizontal + 90°
        case 6: ctx.rotate(0.5 * Math.PI); ctx.translate(0, -height); break; // 90°
        case 7: ctx.rotate(0.5 * Math.PI); ctx.translate(width, -height); ctx.scale(-1, 1); break; // flip vertical + 90°
        case 8: ctx.rotate(-0.5 * Math.PI); ctx.translate(-width, 0); break; // 270°
      }
      
      // Draw with proper dimensions based on orientation
      if (orientation > 4) {
        ctx.drawImage(img, 0, 0, height, width);
      } else {
        ctx.drawImage(img, 0, 0, width, height);
      }
      ctx.restore();
      
      // Convert to JPEG blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          
          // Create new file with .jpg extension (regardless of original format)
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const newFileName = baseName + '.jpg';
          const compressedFile = new File([blob], newFileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          console.log(`[compress] ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (orient:${orientation})`);
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };
    
    img.src = url;
  });
}
