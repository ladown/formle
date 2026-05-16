import type { FormSchema } from 'formle';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { useForm } from '../../src/composables/use-form';

const baseSchema: FormSchema = {
  version: '1',
  fields: [
    { id: 'name', type: 'text', validation: { required: true, minLength: 2 } },
    { id: 'nickname', type: 'text' },
  ],
};

describe('useForm', () => {
  it('initializes values from schema defaults (text → empty string)', () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    expect(form.values).toEqual({ name: '', nickname: '' });
  });

  it('initialValues override defaults', () => {
    const form = useForm({
      schema: baseSchema,
      onSubmit: vi.fn(),
      initialValues: { name: 'Egor' },
    });
    expect(form.values.name).toBe('Egor');
    expect(form.values.nickname).toBe('');
  });

  it('handleSubmit calls onSubmit when valid', async () => {
    const onSubmit = vi.fn();
    const form = useForm({
      schema: baseSchema,
      onSubmit,
      initialValues: { name: 'Egor' },
    });
    await form.handleSubmit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Egor', nickname: '' });
  });

  it('handleSubmit does not call onSubmit when validation fails', async () => {
    const onSubmit = vi.fn();
    const form = useForm({ schema: baseSchema, onSubmit });
    await form.handleSubmit();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('isSubmitting flips during onSubmit and false after', async () => {
    let snapshotDuring = false;
    const form = useForm({
      schema: baseSchema,
      onSubmit: () => {
        snapshotDuring = form.isSubmitting.value;
        return Promise.resolve();
      },
      initialValues: { name: 'Egor' },
    });
    expect(form.isSubmitting.value).toBe(false);
    await form.handleSubmit();
    expect(snapshotDuring).toBe(true);
    expect(form.isSubmitting.value).toBe(false);
  });

  it('isSubmitting flips false even when onSubmit throws (and error re-throws)', async () => {
    const form = useForm({
      schema: baseSchema,
      onSubmit: () => {
        throw new Error('boom');
      },
      initialValues: { name: 'Egor' },
    });
    await expect(form.handleSubmit()).rejects.toThrow('boom');
    expect(form.isSubmitting.value).toBe(false);
  });

  it('errors map populated after failed handleSubmit', async () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    await form.handleSubmit();
    expect(form.errors.value.name.length).toBeGreaterThan(0);
    expect(form.errors.value.name[0].code).toBe('required');
    expect(form.errors.value.nickname).toEqual([]);
  });

  it('isValid is false initially', () => {
    const form = useForm({
      schema: baseSchema,
      onSubmit: vi.fn(),
      initialValues: { name: 'Egor' },
    });
    expect(form.isValid.value).toBe(false);
  });

  it('isValid becomes true after handleSubmit succeeds', async () => {
    const form = useForm({
      schema: baseSchema,
      onSubmit: vi.fn(),
      initialValues: { name: 'Egor' },
    });
    await form.handleSubmit();
    expect(form.isValid.value).toBe(true);
  });

  it('isValid is false after handleSubmit fails', async () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    await form.handleSubmit();
    expect(form.isValid.value).toBe(false);
  });

  it('reset clears errors and restores initial values', async () => {
    const form = useForm({
      schema: baseSchema,
      onSubmit: vi.fn(),
      initialValues: { name: 'Egor' },
    });
    form.values.name = 'changed';
    await form.handleSubmit();
    form.values.name = '';
    await form.handleSubmit();
    expect(form.errors.value.name.length).toBeGreaterThan(0);

    form.reset();
    expect(form.values.name).toBe('Egor');
    expect(form.values.nickname).toBe('');
    expect(form.errors.value.name).toEqual([]);
    expect(form.isValid.value).toBe(false);
    expect(form.isSubmitting.value).toBe(false);
  });

  it('fields map has an entry per schema field', () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    expect(Object.keys(form.fields.value).sort()).toEqual(['name', 'nickname']);
    expect(form.fields.value.name.name).toBe('name');
    expect(form.fields.value.nickname.name).toBe('nickname');
  });

  it('fields[id].value reflects values[id]', async () => {
    const form = useForm({
      schema: baseSchema,
      onSubmit: vi.fn(),
      initialValues: { name: 'Egor' },
    });
    expect(form.fields.value.name.value).toBe('Egor');
    form.values.name = 'Updated';
    await nextTick();
    expect(form.fields.value.name.value).toBe('Updated');
  });

  it("fields[id]['onUpdate:modelValue'] updates values[id]", () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    form.fields.value.name['onUpdate:modelValue']('Hello');
    expect(form.values.name).toBe('Hello');
  });

  it('fields[id].onInput with input event updates values[id]', () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    const input = document.createElement('input');
    input.value = 'typed';
    const event = new Event('input');
    Object.defineProperty(event, 'target', { value: input });
    form.fields.value.name.onInput(event);
    expect(form.values.name).toBe('typed');
  });

  it('fields[id].onInput with non-input target is a no-op', () => {
    const form = useForm({
      schema: baseSchema,
      onSubmit: vi.fn(),
      initialValues: { name: 'Egor' },
    });
    const div = document.createElement('div');
    const event = new Event('input');
    Object.defineProperty(event, 'target', { value: div });
    expect(() => form.fields.value.name.onInput(event)).not.toThrow();
    expect(form.values.name).toBe('Egor');
  });

  it('fields[id].onBlur exists and is a callable no-op', () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    expect(typeof form.fields.value.name.onBlur).toBe('function');
    expect(() => form.fields.value.name.onBlur()).not.toThrow();
  });

  it('mutating values is reactive', async () => {
    const form = useForm({ schema: baseSchema, onSubmit: vi.fn() });
    let seen = '';
    const { watch } = await import('vue');
    watch(
      () => form.values.name,
      (v) => {
        seen = v as string;
      },
    );
    form.values.name = 'Egor';
    await nextTick();
    expect(seen).toBe('Egor');
  });
});
