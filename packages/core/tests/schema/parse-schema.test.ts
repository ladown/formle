import { describe, expect, it } from 'vitest';

import { FormleSchemaError, parseSchema } from '../../src/schema';

describe('parseSchema', () => {
  it('accepts a minimal valid schema with one text field', () => {
    const result = parseSchema({
      version: '1',
      fields: [{ id: 'name', type: 'text' }],
    });
    expect(result.version).toBe('1');
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]).toEqual({ id: 'name', type: 'text' });
  });

  it('accepts a text field with supported validation rules', () => {
    const result = parseSchema({
      version: '1',
      fields: [
        {
          id: 'name',
          type: 'text',
          validation: { required: true, minLength: 2, maxLength: 64, pattern: '^[a-z]+$' },
        },
      ],
    });
    expect(result.fields).toHaveLength(1);
  });

  it('rejects non-object input', () => {
    expect(() => parseSchema(null)).toThrow(FormleSchemaError);
    expect(() => parseSchema('schema')).toThrow(FormleSchemaError);
    expect(() => parseSchema(42)).toThrow(FormleSchemaError);
    expect(() => parseSchema([])).toThrow(FormleSchemaError);
  });

  it('rejects schemas missing version', () => {
    try {
      parseSchema({ fields: [] });
      expect.fail('expected parseSchema to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(FormleSchemaError);
      const issues = (error as FormleSchemaError).issues;
      expect(issues.some((i) => i.path === 'version')).toBe(true);
    }
  });

  it('rejects schemas with the wrong version', () => {
    try {
      parseSchema({ version: '2', fields: [] });
      expect.fail('expected parseSchema to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(FormleSchemaError);
      const issues = (error as FormleSchemaError).issues;
      expect(issues.some((i) => i.path === 'version')).toBe(true);
    }
  });

  it('rejects schemas where fields is not an array', () => {
    try {
      parseSchema({ version: '1', fields: {} });
      expect.fail('expected parseSchema to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(FormleSchemaError);
      const issues = (error as FormleSchemaError).issues;
      expect(issues.some((i) => i.path === 'fields')).toBe(true);
    }
  });

  it('rejects fields with an unsupported type', () => {
    try {
      parseSchema({
        version: '1',
        fields: [{ id: 'email', type: 'email' }],
      });
      expect.fail('expected parseSchema to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(FormleSchemaError);
      const issues = (error as FormleSchemaError).issues;
      expect(issues.some((i) => i.path === 'fields[0].type')).toBe(true);
    }
  });

  it('rejects fields with duplicate ids', () => {
    try {
      parseSchema({
        version: '1',
        fields: [
          { id: 'name', type: 'text' },
          { id: 'name', type: 'text' },
        ],
      });
      expect.fail('expected parseSchema to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(FormleSchemaError);
      const issues = (error as FormleSchemaError).issues;
      expect(
        issues.some(
          (i) => i.path === 'fields[1].id' && i.message.includes('duplicate'),
        ),
      ).toBe(true);
    }
  });

  it('rejects validation rules that are not valid for the field type', () => {
    try {
      parseSchema({
        version: '1',
        fields: [
          {
            id: 'age',
            type: 'text',
            validation: { min: 0 },
          },
        ],
      });
      expect.fail('expected parseSchema to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(FormleSchemaError);
      const issues = (error as FormleSchemaError).issues;
      expect(issues.some((i) => i.path === 'fields[0].validation.min')).toBe(true);
    }
  });

  it('collects multiple errors when multiple issues exist', () => {
    try {
      parseSchema({ version: '2', fields: {} });
      expect.fail('expected parseSchema to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(FormleSchemaError);
      const issues = (error as FormleSchemaError).issues;
      expect(issues.length).toBeGreaterThanOrEqual(2);
      expect(issues.some((i) => i.path === 'version')).toBe(true);
      expect(issues.some((i) => i.path === 'fields')).toBe(true);
    }
  });
});
