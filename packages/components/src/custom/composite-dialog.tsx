import * as React from 'react';
import {
  Dialog, DialogHeader, DialogTitle, DialogDescription,
} from '../ui/dialog';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '../ui/alert-dialog';
import { createSafeTranslation } from '@object-ui/i18n';
import { MobileDialogContent } from './mobile-dialog-content';
import { cn } from '../lib/utils';

const useDialogTranslation = createSafeTranslation({
  'form.discardTitle': 'Discard changes?',
  'form.discardMessage': 'You have unsaved changes. If you close this form now, your edits will be lost.',
  'form.keepEditing': 'Keep editing',
  'form.discard': 'Discard',
  'form.dialogDescriptionFallback': 'Complete the form fields, then submit or cancel.',
}, 'form.discardTitle');

export interface CompositeDialogControls {
  /** Route cancellation through the same guard as Escape, backdrop and Close. */
  requestClose(): void;
  busy: boolean;
}

/** Native React composition; not a serialized FormView or persistence API. */
export interface CompositeDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  /** The host decides whether its compound draft needs discard confirmation. */
  confirmOnDiscard?: boolean;
  children?: React.ReactNode;
  footer?: React.ReactNode | ((controls: CompositeDialogControls) => React.ReactNode);
  className?: string;
}

/** Shared dialog frame for multiple sibling, metadata-driven form sections. */
export function CompositeDialog({
  open, title, description, onOpenChange, busy = false,
  confirmOnDiscard = false, children, footer, className,
}: CompositeDialogProps): React.ReactElement {
  const { t } = useDialogTranslation();
  const [closeState, setCloseState] = React.useState({ open, confirming: false });
  // A host-forced close starts a fresh confirmation session on reopening.
  if (closeState.open !== open) setCloseState({ open, confirming: false });
  const requestClose = React.useCallback(() => {
    if (busy) return;
    if (confirmOnDiscard) setCloseState({ open, confirming: true });
    else onOpenChange(false);
  }, [open, busy, confirmOnDiscard, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) onOpenChange(true);
      else requestClose();
    }}>
      <MobileDialogContent
        className={cn(
          'flex h-[100dvh] flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[var(--ui-modal-max-height,90vh)] sm:max-w-[var(--ui-modal-composite-width,1120px)] sm:p-0',
          className,
        )}
        closeDisabled={busy}
        onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}
      >
        <DialogHeader className={cn(
          'shrink-0 border-b px-4 pt-4 pb-2 sm:px-[var(--ui-modal-padding-x,1.5rem)] sm:pt-[var(--ui-modal-header-padding-top,1.5rem)] sm:pb-[var(--ui-modal-header-padding-bottom,0.5rem)]',
          !description && 'space-y-[var(--ui-modal-empty-description-gap,0.375rem)]',
        )}>
          <DialogTitle className="text-[length:var(--ui-dialog-title-font-size,1.125rem)] leading-[var(--ui-dialog-title-line-height,1)]">
            {title}
          </DialogTitle>
          <DialogDescription className={description ? undefined : 'sr-only'}>
            {description || t('form.dialogDescriptionFallback')}
          </DialogDescription>
        </DialogHeader>
        <div className="@container min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-[var(--ui-modal-padding-x,1.5rem)] sm:py-[var(--ui-modal-body-padding-y,1rem)] sm:max-h-[var(--ui-modal-body-max-height,none)]" aria-busy={busy}>
          <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
            {children}
          </fieldset>
        </div>
        {footer != null && (
          <div className="shrink-0 border-t bg-background px-4 py-3 sm:px-[var(--ui-modal-padding-x,1.5rem)]" data-testid="composite-dialog-footer">
            {typeof footer === 'function' ? footer({ requestClose, busy }) : footer}
          </div>
        )}
        <AlertDialog open={open && closeState.confirming} onOpenChange={(confirming) => setCloseState({ open, confirming })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('form.discardTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('form.discardMessage')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('form.keepEditing')}</AlertDialogCancel>
              <AlertDialogAction disabled={busy} onClick={() => {
                if (busy) return;
                setCloseState({ open, confirming: false });
                onOpenChange(false);
              }}>{t('form.discard')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MobileDialogContent>
    </Dialog>
  );
}
