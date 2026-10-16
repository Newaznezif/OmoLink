export type FieldError = string | undefined;

export type ValidationIssues<T extends Record<string, unknown>> = Partial<Record<keyof T, string>>;

export function validateSignInEmail(value: string): FieldError {
  const v = value.trim();
  if (!v) return 'Enter an email or demo user code.';
  if (v.length > 200) return 'That value is too long.';
  return undefined;
}

export function validateListingDraft(input: {
  title: string;
  description: string;
  unitPriceEtb: string;
  availableQuantity: string;
  minOrderQuantity: string;
}): ValidationIssues<typeof input> {
  const errors: ValidationIssues<typeof input> = {};
  if (!input.title.trim()) errors.title = 'Add a short title.';
  else if (input.title.trim().length < 4) errors.title = 'Titles should be at least 4 characters.';
  else if (input.title.length > 120) errors.title = 'Titles must be under 120 characters.';

  if (!input.description.trim()) errors.description = 'Describe the product or service.';
  else if (input.description.trim().length < 20) errors.description = 'Add a bit more detail (20+ characters).';
  else if (input.description.length > 4000) errors.description = 'Descriptions must stay under 4000 characters.';

  const priceError = validateMoney(input.unitPriceEtb);
  if (priceError) errors.unitPriceEtb = priceError;

  const qtyError = validatePositiveInt(input.availableQuantity, 100_000);
  if (qtyError) errors.availableQuantity = qtyError;

  const minError = validatePositiveInt(input.minOrderQuantity, 10_000);
  if (minError) errors.minOrderQuantity = minError;

  return errors;
}

export function validateMoney(value: string): FieldError {
  const v = value.trim();
  if (!v) return 'Enter a price.';
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(v)) return 'Use a positive number with up to two decimals.';
  const num = Number(v);
  if (!Number.isFinite(num) || num <= 0) return 'Price must be greater than zero.';
  return undefined;
}

export function validatePositiveInt(value: string, max: number): FieldError {
  const v = value.trim();
  if (!v) return 'Enter a whole number.';
  if (!/^\d+$/.test(v)) return 'Whole numbers only.';
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 1) return 'Must be at least 1.';
  if (n > max) return `Must be ${max} or less.`;
  return undefined;
}

export function validateRequired(value: string, label: string): FieldError {
  if (!value.trim()) return `${label} is required.`;
  return undefined;
}
