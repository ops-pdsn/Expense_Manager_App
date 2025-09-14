import type { User } from "@shared/schema";

/**
 * Generates user initials from first and last name
 * Falls back to first name initial, then email initial, then "U"
 * @param user - User object (either from our database or Supabase auth)
 * @returns Initials string (e.g., "JS" for John Smith)
 */
export function getUserInitials(user: any): string {
  if (!user) return "U";

  // Priority 1: Check database fields AND API response fields
  let firstName = user.first_name || user.firstName;
  let lastName = user.last_name || user.lastName;
  
  // Priority 2: Check Supabase user_metadata
  if (!firstName || !lastName) {
    const metadata = user.user_metadata || {};
    firstName = firstName || metadata.firstName || metadata.first_name;
    lastName = lastName || metadata.lastName || metadata.last_name;
  }
  
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  } else if (firstName) {
    return firstName[0].toUpperCase();
  } else if (user.email) {
    return user.email[0].toUpperCase();
  } else {
    return "U";
  }
}

/**
 * Generates a consistent background color based on user initials
 * @param initials - User initials
 * @returns CSS class or style for background color
 */
export function getUserAvatarColor(initials: string): string {
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    "from-blue-500 to-blue-600",
    "from-green-500 to-green-600", 
    "from-purple-500 to-purple-600",
    "from-pink-500 to-pink-600",
    "from-indigo-500 to-indigo-600",
    "from-red-500 to-red-600",
    "from-yellow-500 to-yellow-600",
    "from-teal-500 to-teal-600",
  ];
  
  return colors[Math.abs(hash) % colors.length];
}