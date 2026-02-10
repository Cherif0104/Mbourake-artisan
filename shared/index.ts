export * from './types/database.types'
export {
  SUPABASE_AUTH_STORAGE_KEY,
  getSupabaseAuthOptions,
  type SupabaseAuthOptions,
} from './lib/supabase-core'
export {
  calculateEscrow,
  TVA_RATE,
  DEFAULT_COMMISSION_RATE,
  VERIFIED_ADVANCE_RATE,
  UNVERIFIED_ADVANCE_RATE,
  type EscrowCalculation,
} from './lib/escrowService'
export {
  initiateEscrow,
  confirmDeposit,
  releaseAdvance,
  releaseFullPayment,
  freezeEscrow,
  refundEscrow,
  updateEscrowForNewAmount,
  type EscrowRow,
} from './lib/escrowDbService'
export {
  getSession,
  signInWithPassword,
  signUpWithPassword,
  signOut,
  type AuthClient,
} from './lib/authService'
export {
  createProject,
  getClientProjects,
  getOpenProjects,
  createQuote,
  getProjectQuotes,
  acceptQuote,
  type ProjectRow,
  type QuoteRow,
} from './lib/projectsService'
export {
  getProfile,
  type ProfileRow,
} from './lib/profileService'
export {
  fetchMessages,
  sendMessage,
  subscribeMessages,
  type MessageRow,
} from './lib/messagesService'

