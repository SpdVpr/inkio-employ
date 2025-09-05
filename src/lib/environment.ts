// Environment utilities
export const isDevelopment = () => {
  return process.env.NEXT_PUBLIC_ENVIRONMENT === 'development' || 
         process.env.NODE_ENV === 'development';
};

export const isProduction = () => {
  return process.env.NODE_ENV === 'production' && 
         process.env.NEXT_PUBLIC_ENVIRONMENT !== 'development';
};

export const getEnvironmentName = () => {
  if (isDevelopment()) return 'Development';
  if (isProduction()) return 'Production';
  return 'Unknown';
};

export const getFirebaseProjectId = () => {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'unknown';
};

// Development collection suffix to avoid conflicts
export const getCollectionName = (baseName: string) => {
  if (isDevelopment()) {
    return `${baseName}_dev`;
  }
  return baseName;
};
