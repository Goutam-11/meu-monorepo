'use client';

import {useEffect, useRef} from 'react';
import {useFormContext} from 'react-hook-form';

function errorMessages(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  if (typeof record.message === 'string') return [record.message];
  return Object.entries(record).flatMap(([key, child]) => key === 'ref' ? [] : errorMessages(child));
}

export function AgentFormFeedback({error}: {error?: string}) {
  const {formState: {errors, submitCount}} = useFormContext();
  const messages = [...new Set([...errorMessages(errors), ...(error ? [error] : [])])];
  const messageKey = messages.join('\n');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!submitCount || !messageKey) return;
    const form = ref.current?.closest('form');
    form?.querySelectorAll<HTMLDetailsElement>('details[data-agent-advanced]').forEach(details => { details.open = true; });
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [submitCount, messageKey]);
  return <div ref={ref}>{messages.length > 0 && <div role="alert" className="space-y-2 text-sm text-destructive"><p className="font-medium">Check these settings before saving</p><ul className="list-disc space-y-1 pl-5">{messages.map(message => <li key={message}>{message}</li>)}</ul></div>}</div>;
}
