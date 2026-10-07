import { createSafeTranslation } from '@object-ui/i18n';

/** Shared status copy for every ObjectForm layout, with a provider-less fallback. */
export const useFormStatusTranslation = createSafeTranslation(
  {
    'publicForm.unavailableTitle': 'Form unavailable',
    'publicForm.loading': 'Loading form…',
  },
  'publicForm.loading',
);
