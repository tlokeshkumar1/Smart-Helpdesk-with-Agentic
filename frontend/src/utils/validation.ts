// Utility functions for validation

/**
 * Check if a string is a valid MongoDB ObjectId
 */
export const isValidObjectId = (id: string): boolean => {
  if (!id) return false;
  
  // MongoDB ObjectId is a 24-character hex string
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

/**
 * Sanitize and validate article ID
 */
export const validateArticleId = (id: string | undefined): { isValid: boolean; id: string | null } => {
  if (!id || id === 'new') {
    return { isValid: true, id: id || null };
  }
  
  if (id === 'undefined' || id.trim() === '') {
    return { isValid: false, id: null };
  }
  
  if (!isValidObjectId(id)) {
    return { isValid: false, id: null };
  }
  
  return { isValid: true, id };
};
