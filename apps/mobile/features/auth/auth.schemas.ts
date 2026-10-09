import { z } from 'zod';

import type { TranslationKey } from '@/lib/i18n';

/** Zod messages are translation keys; screens translate them when rendering. */
const msg = (key: TranslationKey) => ({ error: key });

export const PASSWORD_MIN = 8;
/** bcrypt, used by Supabase Auth, ignores everything after 72 bytes. */
export const PASSWORD_MAX = 72;

export const emailSchema = z
  .string()
  .trim()
  .min(1, msg('auth.validation.emailRequired'))
  .pipe(z.email(msg('auth.validation.emailInvalid')));

const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN, msg('auth.validation.passwordTooShort'))
  .max(PASSWORD_MAX, msg('auth.validation.passwordTooLong'))
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), msg('auth.validation.passwordWeak'));

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, msg('auth.validation.passwordRequired')),
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, msg('auth.validation.passwordRequired')),
  })
  .refine((values) => values.password === values.confirmPassword, {
    ...msg('auth.validation.passwordMismatch'),
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6,10}$/, msg('auth.validation.codeInvalid')),
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, msg('auth.validation.passwordRequired')),
  })
  .refine((values) => values.password === values.confirmPassword, {
    ...msg('auth.validation.passwordMismatch'),
    path: ['confirmPassword'],
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
