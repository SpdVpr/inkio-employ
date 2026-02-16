// Environment utilities
export const isDevelopment = () => {
  // Pokud je explicitně nastaveno NEXT_PUBLIC_ENVIRONMENT, použij to
  if (process.env.NEXT_PUBLIC_ENVIRONMENT) {
    return process.env.NEXT_PUBLIC_ENVIRONMENT === 'development';
  }
  return process.env.NODE_ENV === 'development';
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
  const collectionName = isDevelopment() ? `${baseName}_dev` : baseName;
  console.log(`Environment: ${getEnvironmentName()}, Collection: ${collectionName}`);
  return collectionName;
};
