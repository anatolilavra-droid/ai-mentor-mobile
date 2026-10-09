import { resetPasswordSchema, signInSchema, signUpSchema } from '@/features/auth/auth.schemas';

const firstError = (result: {
  success: boolean;
  error?: { issues: { message: string; path: PropertyKey[] }[] };
}) => result.error?.issues[0];

describe('auth schemas', () => {
  it('trims and accepts a valid email', () => {
    const result = signInSchema.parse({ email: '  anatoliy@example.com ', password: 'x' });
    expect(result.email).toBe('anatoliy@example.com');
  });

  it.each([
    ['', 'auth.validation.emailRequired'],
    ['not-an-email', 'auth.validation.emailInvalid'],
    ['a@b', 'auth.validation.emailInvalid'],
  ])('rejects email %p with %s', (email, key) => {
    expect(firstError(signInSchema.safeParse({ email, password: 'secret1' }))?.message).toBe(key);
  });

  it.each([
    ['short1', 'auth.validation.passwordTooShort'],
    ['onlyletters', 'auth.validation.passwordWeak'],
    ['12345678', 'auth.validation.passwordWeak'],
    [`a1${'x'.repeat(71)}`, 'auth.validation.passwordTooLong'],
  ])('rejects new password %p with %s', (password, key) => {
    const result = signUpSchema.safeParse({
      email: 'a@example.com',
      password,
      confirmPassword: password,
    });
    expect(firstError(result)?.message).toBe(key);
  });

  it('accepts Cyrillic letters in a password', () => {
    expect(
      signUpSchema.safeParse({
        email: 'a@example.com',
        password: 'пароль2026',
        confirmPassword: 'пароль2026',
      }).success,
    ).toBe(true);
  });

  it('reports mismatched passwords on the confirmation field', () => {
    const issue = firstError(
      signUpSchema.safeParse({
        email: 'a@example.com',
        password: 'mentor2026',
        confirmPassword: 'mentor2027',
      }),
    );
    expect(issue?.message).toBe('auth.validation.passwordMismatch');
    expect(issue?.path).toEqual(['confirmPassword']);
  });

  it.each(['12345', 'abcdef', '12345678901'])('rejects reset code %p', (code) => {
    const result = resetPasswordSchema.safeParse({
      code,
      password: 'mentor2026',
      confirmPassword: 'mentor2026',
    });
    expect(firstError(result)?.message).toBe('auth.validation.codeInvalid');
  });

  it('accepts a 6-digit reset code', () => {
    expect(
      resetPasswordSchema.safeParse({
        code: ' 123456 ',
        password: 'mentor2026',
        confirmPassword: 'mentor2026',
      }).success,
    ).toBe(true);
  });
});
