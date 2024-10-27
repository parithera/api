/* Defines how long a JWT Token lives, after creation */
export const CONST_JWT_TOKEN_EXPIRES_IN = '10m'; // 10 minutes

/* Defines how long a JWT Refresh Token lives, after creation */
export const CONST_REFRESH_JWT_TOKEN_EXPIRES_IN = '7d'; // 7 days

/* Defines the supported JWT algorithm */
export const CONST_JWT_ALGORITHM = 'ES512'; // ECDSA

/* Defines after how many minutes the vcs repos should be marked as invalidated */
/* If the user then wants to retrieve repos, the cache date is check and if more than 10 minutes old, will be re-synced */
export const CONST_VCS_INTEGRATION_CACHE_INVALIDATION_MINUTES = 10;

/** Defines how many salt rounds or cost factor (the higher the more difficult brute-forcing becomes) */
export const CONST_PASSWORD_SALT_ROUNDS = 10;
