import { describe, expect, it } from 'vitest';

import type { FormSchema } from '../../src/schema';
import { validate } from '../../src/validation';

function schema(fields: FormSchema['fields']): FormSchema {
  return { version: '1', fields };
}

describe('validate', () => {
  it('returns empty array for valid input', () => {
    const s = schema([
      { id: 'name', type: 'text', validation: { required: true, minLength: 2 } },
    ]);
    expect(validate(s, { name: 'Ada' })).toEqual([]);
  });

  it('returns empty array for an empty schema regardless of values', () => {
    expect(validate(schema([]), {})).toEqual([]);
    expect(validate(schema([]), { stray: 'value' })).toEqual([]);
  });

  it('produces a required issue when a required field is missing', () => {
    const s = schema([{ id: 'name', type: 'text', validation: { required: true } }]);
    const result = validate(s, {});
    expect(result).toEqual([
      { path: 'name', code: 'required', message: 'This field is required' },
    ]);
  });

  it('produces a required issue when a required field is an empty string', () => {
    const s = schema([{ id: 'name', type: 'text', validation: { required: true } }]);
    const result = validate(s, { name: '' });
    expect(result).toHaveLength(1);
    expect(result[0]?.code).toBe('required');
  });

  it('produces a minLength issue with meta containing minLength and actual', () => {
    const s = schema([{ id: 'name', type: 'text', validation: { minLength: 4 } }]);
    const result = validate(s, { name: 'Ada' });
    expect(result).toEqual([
      {
        path: 'name',
        code: 'minLength',
        message: 'Must be at least 4 characters',
        meta: { minLength: 4, actual: 3 },
      },
    ]);
  });

  it('produces a maxLength issue with meta', () => {
    const s = schema([{ id: 'name', type: 'text', validation: { maxLength: 3 } }]);
    const result = validate(s, { name: 'Alice' });
    expect(result).toEqual([
      {
        path: 'name',
        code: 'maxLength',
        message: 'Must be at most 3 characters',
        meta: { maxLength: 3, actual: 5 },
      },
    ]);
  });

  it('produces a pattern issue when value does not match', () => {
    const s = schema([
      { id: 'slug', type: 'text', validation: { pattern: '^[a-z]+$' } },
    ]);
    const result = validate(s, { slug: 'Bad Value' });
    expect(result).toHaveLength(1);
    expect(result[0]?.code).toBe('pattern');
    expect(result[0]?.message).toBe('Invalid format');
  });

  it('collects multiple rule violations on the same field', () => {
    const s = schema([
      {
        id: 'slug',
        type: 'text',
        validation: { minLength: 5, pattern: '^[a-z]+$' },
      },
    ]);
    const result = validate(s, { slug: 'AB' });
    expect(result.map((i) => i.code)).toEqual(['minLength', 'pattern']);
  });

  it('reports issues across multiple fields with correct paths', () => {
    const s = schema([
      { id: 'first', type: 'text', validation: { required: true } },
      { id: 'second', type: 'text', validation: { minLength: 3 } },
    ]);
    const result = validate(s, { second: 'no' });
    expect(result).toEqual([
      { path: 'first', code: 'required', message: 'This field is required' },
      {
        path: 'second',
        code: 'minLength',
        message: 'Must be at least 3 characters',
        meta: { minLength: 3, actual: 2 },
      },
    ]);
  });

  it('does not check minLength when required has already failed', () => {
    const s = schema([
      {
        id: 'name',
        type: 'text',
        validation: { required: true, minLength: 5 },
      },
    ]);
    const result = validate(s, {});
    expect(result).toHaveLength(1);
    expect(result[0]?.code).toBe('required');
  });

  it('skips length and pattern checks when a non-required value is missing', () => {
    const s = schema([
      {
        id: 'name',
        type: 'text',
        validation: { minLength: 2, pattern: '^[a-z]+$' },
      },
    ]);
    expect(validate(s, {})).toEqual([]);
  });

  describe('email field', () => {
    it('is valid when empty and not required', () => {
      const s = schema([{ id: 'email', type: 'email' }]);
      expect(validate(s, { email: '' })).toEqual([]);
      expect(validate(s, {})).toEqual([]);
    });

    it('produces only a required issue when empty and required', () => {
      const s = schema([
        { id: 'email', type: 'email', validation: { required: true } },
      ]);
      const result = validate(s, { email: '' });
      expect(result).toEqual([
        { path: 'email', code: 'required', message: 'This field is required' },
      ]);
    });

    it('produces an email issue for a non-empty invalid address', () => {
      const s = schema([
        { id: 'email', type: 'email', validation: { required: true } },
      ]);
      const result = validate(s, { email: 'not-an-email' });
      expect(result).toEqual([
        { path: 'email', code: 'email', message: 'Invalid email address' },
      ]);
    });

    it('is valid for a non-empty well-formed address', () => {
      const s = schema([
        { id: 'email', type: 'email', validation: { required: true } },
      ]);
      expect(validate(s, { email: 'ada@example.com' })).toEqual([]);
    });

    it('orders the email issue before minLength when both fail', () => {
      const s = schema([
        {
          id: 'email',
          type: 'email',
          validation: { required: true, minLength: 20 },
        },
      ]);
      const result = validate(s, { email: 'nope' });
      expect(result.map((i) => i.code)).toEqual(['email', 'minLength']);
    });

    it('applies both the built-in format check and an explicit pattern', () => {
      const s = schema([
        {
          id: 'email',
          type: 'email',
          validation: { pattern: '@example\\.com$' },
        },
      ]);
      // Valid format but fails the explicit domain pattern.
      const wrongDomain = validate(s, { email: 'ada@other.org' });
      expect(wrongDomain.map((i) => i.code)).toEqual(['pattern']);

      // Matches the pattern's domain but is not a valid email shape.
      const badShape = validate(s, { email: 'ada@@example.com' });
      expect(badShape.map((i) => i.code)).toEqual(['email']);

      // Satisfies both.
      expect(validate(s, { email: 'ada@example.com' })).toEqual([]);
    });
  });

  describe('password field', () => {
    it('validates like text: required fires when empty', () => {
      const s = schema([
        { id: 'pw', type: 'password', validation: { required: true } },
      ]);
      const result = validate(s, { pw: '' });
      expect(result).toEqual([
        { path: 'pw', code: 'required', message: 'This field is required' },
      ]);
    });

    it('enforces minLength', () => {
      const s = schema([
        { id: 'pw', type: 'password', validation: { required: true, minLength: 8 } },
      ]);
      const result = validate(s, { pw: 'short' });
      expect(result).toHaveLength(1);
      expect(result[0]?.code).toBe('minLength');
    });

    it('emits no format issue for any non-empty string', () => {
      const s = schema([
        { id: 'pw', type: 'password', validation: { required: true, minLength: 8 } },
      ]);
      expect(validate(s, { pw: 'not an email at all !!' })).toEqual([]);
    });
  });
});
