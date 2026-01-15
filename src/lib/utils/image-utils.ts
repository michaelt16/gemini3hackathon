/**
 * Image utility functions
 */

/**
 * Compute a simple hash for duplicate detection
 */
export function computeImageHash(imageData: string): string {
  const start = imageData.substring(0, 500);
  const end = imageData.substring(imageData.length - 500);
  return `${imageData.length}-${start.slice(-50)}-${end.slice(0, 50)}`;
}

/**
 * Detect motion by comparing current frame with previous frame
 * Returns true if significant motion is detected
 */
export function detectMotion(currentFrame: string, previousFrame: string | null): { hasMotion: boolean; newPreviousFrame: string } {
  if (!previousFrame) {
    return { hasMotion: false, newPreviousFrame: currentFrame };
  }
  
  // Compare first 500 chars and last 500 chars as a quick hash
  const prevHash = previousFrame.substring(0, 500) + previousFrame.substring(previousFrame.length - 500);
  const currHash = currentFrame.substring(0, 500) + currentFrame.substring(currentFrame.length - 500);
  
  // Calculate similarity
  let matches = 0;
  const minLength = Math.min(prevHash.length, currHash.length);
  for (let i = 0; i < minLength; i++) {
    if (prevHash[i] === currHash[i]) matches++;
  }
  const similarity = matches / minLength;
  
  // Only consider it motion if similarity is below 90% (allows for slight hand movement)
  const hasSignificantMotion = similarity < 0.90;
  
  return { hasMotion: hasSignificantMotion, newPreviousFrame: currentFrame };
}
