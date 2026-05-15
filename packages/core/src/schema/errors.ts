export type SchemaIssue = {
  path: string;
  message: string;
};

export class FormleSchemaError extends Error {
  readonly issues: SchemaIssue[];

  constructor(issues: SchemaIssue[]) {
    const summary = issues
      .map((issue) => `  - ${issue.path || '<root>'}: ${issue.message}`)
      .join('\n');
    super(`Invalid Formle schema:\n${summary}`);
    this.name = 'FormleSchemaError';
    this.issues = issues;
  }
}
