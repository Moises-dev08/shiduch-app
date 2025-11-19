/**
 * Calculate age from date of birth
 * @param dob - Date of birth as string (ISO format) or Date object
 * @returns Age in years
 */
export const calculateAge = (dob: string | Date | undefined): number => {
  if (!dob) return 0;
  
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Format age for display
 * @param dob - Date of birth
 * @returns Formatted age string (e.g., "Age: 34" or "Age not specified")
 */
export const formatAge = (dob: string | Date | undefined): string => {
  const age = calculateAge(dob);
  return age > 0 ? `${age}` : 'Not specified';
};

