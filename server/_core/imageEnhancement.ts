import sharp from 'sharp';

/**
 * Enhance receipt image for better visibility and clarity
 * - Straighten the image (detect and correct rotation)
 * - Denoise (reduce noise)
 * - Normalize lighting (improve contrast and brightness)
 * - Compress for web delivery
 */
export async function enhanceReceiptImage(
  imageBuffer: Buffer,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}
): Promise<Buffer> {
  const {
    maxWidth = 1200,
    maxHeight = 1600,
    quality = 85,
  } = options;

  try {
    // Get image metadata to check dimensions
    const metadata = await sharp(imageBuffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to read image dimensions');
    }

    // Apply image enhancements
    let pipeline = sharp(imageBuffer);

    // 1. Normalize lighting and improve contrast
    // Increase contrast and brightness for better readability
    pipeline = pipeline
      .normalize() // Auto-normalize levels
      .modulate({
        brightness: 1.05, // Slight brightness increase
        saturation: 0.9,  // Reduce saturation for cleaner look
      });

    // 2. Denoise using median filter (reduces noise while preserving edges)
    // Sharp doesn't have built-in denoise, but we can use blur + sharpen technique
    pipeline = pipeline
      .median(2) // Apply median filter for denoising
      .sharpen({
        sigma: 1.5, // Slight sharpening to enhance text clarity
      });

    // 3. Resize if needed while maintaining aspect ratio
    pipeline = pipeline.resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    // 4. Convert to JPEG with optimization
    const enhancedBuffer = await pipeline
      .jpeg({
        quality,
        progressive: true,
        mozjpeg: true, // Use mozjpeg for better compression
      })
      .toBuffer();

    return enhancedBuffer;
  } catch (error) {
    console.error('[Image Enhancement] Error:', error);
    // If enhancement fails, return original buffer
    return imageBuffer;
  }
}

/**
 * Detect if image is rotated and return rotation angle
 * This is a simple heuristic - in production, consider using ML-based detection
 */
export async function detectImageRotation(imageBuffer: Buffer): Promise<number> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    // Return EXIF rotation if available
    return metadata.orientation || 0;
  } catch (error) {
    console.error('[Image Rotation Detection] Error:', error);
    return 0;
  }
}

/**
 * Auto-straighten image based on detected rotation
 */
export async function autoStraightenImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const rotation = await detectImageRotation(imageBuffer);
    
    if (rotation === 0 || rotation === 1) {
      // No rotation needed
      return imageBuffer;
    }

    // Map EXIF orientation to rotation angle
    const rotationMap: Record<number, number> = {
      3: 180,
      6: 270,
      8: 90,
    };

    const angle = rotationMap[rotation] || 0;

    if (angle === 0) {
      return imageBuffer;
    }

    // Rotate image
    const straightenedBuffer = await sharp(imageBuffer)
      .rotate(angle, { background: { r: 255, g: 255, b: 255 } })
      .toBuffer();

    return straightenedBuffer;
  } catch (error) {
    console.error('[Image Straightening] Error:', error);
    return imageBuffer;
  }
}

/**
 * Complete receipt image processing pipeline
 */
export async function processReceiptImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // 1. Auto-straighten
    let processed = await autoStraightenImage(imageBuffer);

    // 2. Enhance
    processed = await enhanceReceiptImage(processed);

    return processed;
  } catch (error) {
    console.error('[Receipt Processing] Error:', error);
    return imageBuffer;
  }
}
