/**
 * Password rules, in one place.
 *
 * These mirror the server in `supabase/config.toml`:
 *   minimum_password_length = 8
 *   password_requirements   = "lower_upper_letters_digits"
 *
 * They previously lived inline in two components and had already drifted —
 * ResetPassword accepted 6 characters while the server rejected anything under
 * 8, so a "valid" password failed with a raw server error. Change the rules
 * here and both the sign-up and reset screens follow.
 */

export const PASSWORD_MIN_LENGTH = 8;

/** Placeholder copy for password inputs. */
export const PASSWORD_HINT = `At least ${PASSWORD_MIN_LENGTH} characters, with uppercase, lowercase and a number`;

/**
 * Returns a human-readable problem, or null when the password is acceptable.
 * Wording is deliberately actionable and names the missing ingredient.
 */
export function validatePassword(value: string): string | null {
  if (!value) return 'Enter a password.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.';
  if (!/\d/.test(value)) return 'Password must include a number.';
  return null;
}
