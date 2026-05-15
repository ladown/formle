export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'select';

export type Option = {
  value: string;
  label: string;
};

export type ValidationRules = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  custom?: string;
};

export type Condition = {
  field: string;
  equals?: unknown;
  notEquals?: unknown;
  in?: unknown[];
};

type FieldBase = {
  id: string;
  label?: string;
  description?: string;
  placeholder?: string;
  default?: unknown;
  validation?: ValidationRules;
  showWhen?: Condition;
  ui?: Record<string, unknown>;
};

export type TextField = FieldBase & { type: 'text' };
export type EmailField = FieldBase & { type: 'email' };
export type PasswordField = FieldBase & { type: 'password' };
export type NumberField = FieldBase & { type: 'number' };
export type TextareaField = FieldBase & { type: 'textarea'; rows?: number };
export type CheckboxField = FieldBase & { type: 'checkbox' };
export type RadioField = FieldBase & { type: 'radio'; options: Option[] };
export type SelectField = FieldBase & { type: 'select'; options: Option[] };

export type Field =
  | TextField
  | EmailField
  | PasswordField
  | NumberField
  | TextareaField
  | CheckboxField
  | RadioField
  | SelectField;

export type SubmitConfig = {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
};

export type FormSchema = {
  version: '1';
  id?: string;
  fields: Field[];
  submit?: SubmitConfig;
  meta?: Record<string, unknown>;
};
