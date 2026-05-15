export type ValidationCode = 'required' | 'minLength' | 'maxLength' | 'pattern';

export type ValidationIssue = {
  /** Field id where the issue occurred. */
  path: string;
  /** Stable identifier for this kind of issue. */
  code: ValidationCode;
  /** Default English message. */
  message: string;
  /** Context for message overrides (e.g. { minLength: 2 } or { actual: 3 }). */
  meta?: Record<string, unknown>;
};

export type FormValues = Record<string, unknown>;
