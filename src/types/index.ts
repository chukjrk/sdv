// Export all types from one place
export * from './database'
export * from './agents'

// Utility types
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>