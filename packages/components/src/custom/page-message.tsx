/** Transient page feedback reuses the host's existing Sonner toaster. */
import * as React from 'react';
import { ComponentRegistry } from '@object-ui/core';
import { CircleX, CircleCheck, TriangleAlert, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export interface PageMessageProps {
  children: React.ReactNode;
  severity?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  notificationKey?: string;
  /** Explicit dismissal only; expiration does not clear a page's failure state. */
  onClose?: () => void;
}

type Owner = React.RefObject<{ children: React.ReactNode; onClose?: () => void }>;
type Entry = { id: string; owners: Map<string, Owner>; revision: number; listeners: Set<() => void> };
const entries = new Map<string, Entry>();

function textContent(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join(' ');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textContent(node.props.children);
  return '';
}

function publish(entry: Entry) {
  entry.revision += 1;
  entry.listeners.forEach(listener => listener());
}

function PageMessageBody({ entry, severity }: { entry: Entry; severity: NonNullable<PageMessageProps['severity']> }) {
  React.useSyncExternalStore(
    React.useCallback(listener => { entry.listeners.add(listener); return () => entry.listeners.delete(listener); }, [entry]),
    React.useCallback(() => entry.revision, [entry]),
    () => 0,
  );
  const owners = [...entry.owners.values()];
  const owner = owners[owners.length - 1];
  if (!owner) return null;
  const Icon = severity === 'error' ? CircleX : severity === 'success' ? CircleCheck : severity === 'warning' ? TriangleAlert : Info;
  return <div data-slot="page-message" data-severity={severity} role={severity === 'error' ? 'alert' : 'status'} aria-live={severity === 'error' ? 'assertive' : 'polite'} className="flex max-w-[min(520px,calc(100vw-32px))] items-start gap-2.5 rounded-md border bg-popover px-3.5 py-3 text-sm text-popover-foreground shadow-lg">
    <Icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', severity === 'error' ? 'text-destructive' : severity === 'warning' ? 'text-amber-500' : severity === 'success' ? 'text-emerald-600' : 'text-primary')} />
    <div className="min-w-0 flex-1 break-words leading-5">{owner.current.children}</div>
    <button type="button" aria-label="Dismiss message" className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => { toast.dismiss(entry.id); entry.owners.forEach(ref => ref.current.onClose?.()); }}><X className="size-3.5" /></button>
  </div>;
}

export function PageMessage({ children, severity = 'info', duration, notificationKey, onClose }: PageMessageProps) {
  const ownerId = React.useId();
  const latest = React.useRef({ children, onClose });
  React.useLayoutEffect(() => { latest.current = { children, onClose }; }, [children, onClose]);
  const message = textContent(children).trim();
  const key = `${severity}:${notificationKey || message}`;
  const lifetime = duration === 0 ? Infinity : duration ?? (severity === 'error' ? 6000 : severity === 'warning' ? 5000 : severity === 'success' ? 3000 : 4000);
  React.useEffect(() => {
    if (!message) return;
    let entry = entries.get(key);
    if (!entry) { entry = { id: `page-message:${key}`, owners: new Map(), revision: 0, listeners: new Set() }; entries.set(key, entry); }
    entry.owners.set(ownerId, latest);
    publish(entry);
    const displayed = entry;
    toast.custom(() => <PageMessageBody entry={displayed} severity={severity} />, { id: entry.id, position: 'top-center', duration: lifetime, closeButton: false });
    return () => {
      entry!.owners.delete(ownerId);
      publish(entry!);
      if (!entry!.owners.size) { toast.dismiss(entry!.id); entries.delete(key); }
    };
  }, [key, lifetime, ownerId, message, severity]);
  React.useLayoutEffect(() => { const entry = entries.get(key); if (entry) publish(entry); }, [key, children, onClose]);
  return null;
}

ComponentRegistry.registerReactRuntimeComponent('PageMessage', PageMessage, { injectDataSource: false });
const hot = (import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }).hot;
hot?.dispose(() => ComponentRegistry.unregisterReactRuntimeComponent('PageMessage'));
