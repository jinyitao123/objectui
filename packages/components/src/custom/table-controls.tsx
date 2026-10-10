/** Shared table preferences and a visible horizontal scroll control. */
import * as React from 'react';
import { Settings, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './profile-controls';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../lib/utils';

export interface TableSettingsColumn {
  key: string;
  label: string;
  required?: boolean;
  movable?: boolean;
}

const defaultLabels = {
  title: 'Column settings', heading: 'Visible columns', reset: 'Reset defaults',
  required: 'Required', done: 'Done', shown: 'Shown', up: 'Move up', down: 'Move down',
};

export function TableColumnSettings({ columns, hiddenKeys, onToggle, onReorder, onReset, labels = defaultLabels }: {
  columns: TableSettingsColumn[];
  hiddenKeys: ReadonlySet<string>;
  onToggle: (key: string) => void;
  onReorder?: (keys: string[]) => void;
  onReset: () => void;
  labels?: typeof defaultLabels;
}) {
  const [open, setOpen] = React.useState(false);
  const dragged = React.useRef<string | null>(null);
  const move = (key: string | null, target?: string) => {
    if (!key || !target || key === target || !onReorder) return;
    if (!columns.some(column => column.key === key) || !columns.some(column => column.key === target)) return;
    if (columns.find(column => column.key === key)?.movable === false || columns.find(column => column.key === target)?.movable === false) return;
    const keys = columns.map(column => column.key);
    keys.splice(keys.indexOf(key), 1);
    keys.splice(keys.indexOf(target), 0, key);
    onReorder(keys);
  };
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label={labels.title} title={labels.title} data-slot="table-column-settings"><Settings className="size-4" /></Button></PopoverTrigger>
    <PopoverContent align="end" className="flex w-[260px] max-h-[min(450px,80vh)] flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between border-b px-4 py-3 text-sm"><strong className="font-medium">{labels.heading}</strong><Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary" onClick={onReset}>{labels.reset}</Button></div>
      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {columns.map((column, index) => <div key={column.key} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted" draggable={!!onReorder && column.movable !== false} onDragStart={event => { dragged.current = column.key; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', column.key); }} onDragOver={event => { if (onReorder && column.movable !== false) event.preventDefault(); }} onDrop={event => { event.preventDefault(); move(dragged.current, column.key); dragged.current = null; }}>
          <GripVertical className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"><Checkbox checked={column.required || !hiddenKeys.has(column.key)} disabled={column.required} onCheckedChange={() => onToggle(column.key)} /><span className="truncate" title={column.label}>{column.label}</span></label>
          {column.required && <span className="shrink-0 text-[10px] text-muted-foreground">{labels.required}</span>}
          {onReorder && column.movable !== false && <span className="flex items-center">
            <Button variant="ghost" size="icon" className="size-5" aria-label={`${labels.up} ${column.label}`} disabled={!columns[index - 1] || columns[index - 1].movable === false} onClick={() => move(column.key, columns[index - 1]?.key)}><ChevronUp className="size-3" /></Button>
            <Button variant="ghost" size="icon" className="size-5" aria-label={`${labels.down} ${column.label}`} disabled={!columns[index + 1] || columns[index + 1].movable === false} onClick={() => move(column.key, columns[index + 1]?.key)}><ChevronDown className="size-3" /></Button>
          </span>}
        </div>)}
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3"><span className="text-xs text-muted-foreground">{labels.shown} {columns.filter(column => column.required || !hiddenKeys.has(column.key)).length} / {columns.length}</span><Button size="sm" onClick={() => setOpen(false)}>{labels.done}</Button></div>
    </PopoverContent>
  </Popover>;
}

export function TableHorizontalScrollbar({ viewportRef, className, label = 'Scroll table horizontally' }: {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  label?: string;
}) {
  const track = React.useRef<HTMLDivElement>(null);
  const cleanup = React.useRef<(() => void) | null>(null);
  const [metrics, setMetrics] = React.useState({ viewport: 0, total: 0, left: 0, track: 0 });
  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const previousOwner = viewport.getAttribute('data-table-scrollbar-owner');
    viewport.setAttribute('data-table-scrollbar-owner', 'custom');
    const previousSlot = viewport.getAttribute('data-slot');
    if (!previousSlot) viewport.setAttribute('data-slot', 'table-container');
    const wheel = (event: WheelEvent) => {
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientWidth : 1;
      const horizontal = (event.deltaX || (event.shiftKey ? event.deltaY : 0)) * scale;
      if (!horizontal || viewport.scrollWidth <= viewport.clientWidth) return;
      event.preventDefault();
      viewport.scrollLeft += horizontal;
      if (!event.shiftKey && event.deltaY) viewport.scrollTop += event.deltaY * scale;
    };
    const keys = (event: KeyboardEvent) => {
      if (event.target !== viewport || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      viewport.scrollLeft += event.key === 'ArrowRight' ? 60 : -60;
    };
    viewport.addEventListener('wheel', wheel, { passive: false });
    viewport.addEventListener('keydown', keys);
    const measure = () => {
      const next = { viewport: viewport.clientWidth, total: viewport.scrollWidth, left: viewport.scrollLeft, track: track.current?.clientWidth || viewport.clientWidth };
      setMetrics(current => Object.keys(next).every(key => current[key as keyof typeof next] === next[key as keyof typeof next]) ? current : next);
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(viewport);
    if (track.current) observer?.observe(track.current);
    const observeTables = () => { viewport.querySelectorAll('table').forEach(table => observer?.observe(table)); measure(); };
    const mutations = new MutationObserver(observeTables);
    mutations.observe(viewport, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    viewport.addEventListener('scroll', measure, { passive: true });
    observeTables();
    return () => { observer?.disconnect(); mutations.disconnect(); viewport.removeEventListener('scroll', measure); viewport.removeEventListener('wheel', wheel); viewport.removeEventListener('keydown', keys); if (previousOwner === null) viewport.removeAttribute('data-table-scrollbar-owner'); else viewport.setAttribute('data-table-scrollbar-owner', previousOwner); if (!previousSlot) viewport.removeAttribute('data-slot'); cleanup.current?.(); };
  }, [viewportRef]);
  const range = Math.max(0, metrics.total - metrics.viewport);
  const thumb = range ? Math.max(24, metrics.track * metrics.viewport / metrics.total) : metrics.track;
  const space = Math.max(0, metrics.track - thumb);
  const position = range ? metrics.left / range * space : 0;
  const setPosition = (value: number) => { if (viewportRef.current) viewportRef.current.scrollLeft = Math.max(0, Math.min(range, value)); };
  const startDrag = (event: React.PointerEvent) => {
    if (!range || !space || event.button !== 0 || !viewportRef.current || !track.current) return;
    event.preventDefault(); cleanup.current?.();
    if ((event.target as Element).getAttribute('data-slot') !== 'table-scroll-thumb') setPosition((event.clientX - track.current.getBoundingClientRect().left - thumb / 2) / space * range);
    const start = event.clientX, left = viewportRef.current.scrollLeft;
    const move = (next: PointerEvent) => setPosition(left + (next.clientX - start) / space * range);
    const stop = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); cleanup.current = null; };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', stop); window.addEventListener('pointercancel', stop); cleanup.current = stop;
  };
  return <div ref={track} hidden={!range} data-slot="table-horizontal-scrollbar" className={cn('h-2.5 w-full shrink-0 select-none touch-none overflow-hidden rounded bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring', className)} role="scrollbar" aria-label={label} aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={Math.round(range)} aria-valuenow={Math.round(metrics.left)} tabIndex={range ? 0 : -1} onPointerDown={startDrag} onKeyDown={event => {
    const steps: Record<string, number> = { ArrowLeft: metrics.left - 60, ArrowRight: metrics.left + 60, PageUp: metrics.left - metrics.viewport, PageDown: metrics.left + metrics.viewport, Home: 0, End: range };
    if (steps[event.key] !== undefined && range) { event.preventDefault(); setPosition(steps[event.key]); }
  }}><svg width="100%" height="10" aria-hidden="true"><rect data-slot="table-scroll-thumb" x={position} y="2" width={thumb} height="6" rx="3" className={cn('fill-muted-foreground/50', range ? 'cursor-grab active:cursor-grabbing hover:fill-muted-foreground/70' : 'opacity-30')} /></svg></div>;
}
