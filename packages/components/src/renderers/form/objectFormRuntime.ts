import { createContext } from 'react';

/**
 * Result of validating an ObjectForm without submitting it.
 *
 * These are React runtime contracts. They are deliberately not part of the
 * serializable FormSchema or ObjectForm metadata surface.
 */
export type ObjectFormValidationResult =
  | { valid: true; values: Record<string, unknown> }
  | { valid: false; errors: Record<string, string>; formError?: string };

/** A mounted simple ObjectForm's host-facing validation controller. */
export interface ObjectFormController {
  validate(): Promise<ObjectFormValidationResult>;
}

/**
 * Private bridge between plugin-form's ObjectForm and its registered form
 * renderer. Keeping this channel in React context prevents runtime callbacks
 * and controlled values from becoming JSON / Spec keys on either schema.
 */
export interface ObjectFormRuntimeContextValue {
  values?: Record<string, unknown>;
  onValuesChange?: (values: Record<string, unknown>) => void;
  onControllerReady?: (controller: ObjectFormController | null) => void;
  prepareValues?: (values: Record<string, unknown>) => Record<string, unknown>;
  unavailableReason?: string;
}

export const ObjectFormRuntimeContext =
  createContext<ObjectFormRuntimeContextValue | null>(null);
