import { page, type AreaRoutes } from '../types';

// Area 'auth' (workstream E1): sign-in/up pages in the public layout; /k/:token full-screen (bare).
export const area: AreaRoutes = {
  site: [
    page('dang-nhap', () => import('@/features/auth/LoginPage')),
    page('dang-ky', () => import('@/features/auth/SignupPage')),
    page('auth/callback', () => import('@/features/auth/CallbackPage')),
    page('quen-mat-khau', () => import('@/features/auth/ForgotPasswordPage')),
    page('dat-lai-mat-khau', () => import('@/features/auth/ResetPasswordPage')),
  ],
  bare: [page('k/:token', () => import('@/features/narrators/ClaimLinkPage'))],
};
