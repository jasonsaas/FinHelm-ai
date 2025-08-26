export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
  },
  ACCOUNTS: {
    LIST: '/accounts',
    CREATE: '/accounts',
    GET: '/accounts/:id',
    UPDATE: '/accounts/:id',
    DELETE: '/accounts/:id',
  },
  TRANSACTIONS: {
    LIST: '/transactions',
    CREATE: '/transactions',
    GET: '/transactions/:id',
    UPDATE: '/transactions/:id',
    DELETE: '/transactions/:id',
  },
} as const

export const TRANSACTION_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Income',
  'Other',
] as const

export const ACCOUNT_TYPES = [
  'checking',
  'savings',
  'credit',
  'investment',
] as const

export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
] as const