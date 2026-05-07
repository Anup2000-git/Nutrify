/**
 * Auth module — public API.
 *
 * Module boundary: Other modules import ONLY from this file.
 */

export {
    getCurrentSession, signIn,
    signInWithGoogle,
    signOut, signUp
} from "./services/authService";

export { useAuth, useAuthInit, useRefreshProfile } from "./hooks/useAuth";

export type { AuthError } from "./services/authService";
