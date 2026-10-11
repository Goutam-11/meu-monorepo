'use client';

import {forwardRef,useEffect,useId,useState,type AriaAttributes} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Check,ChevronsUpDown} from 'lucide-react';
import {useTRPC} from '@/trpc/client';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Command,CommandInput,CommandList,CommandItem} from '@/components/ui/command';
import {Skeleton} from '@/components/ui/skeleton';

interface Props extends AriaAttributes {credentialId:string;value:string;onChange:(value:string)=>void;onBlur:()=>void;id?:string;disabled?:boolean;}

export const ModelPicker=forwardRef<HTMLButtonElement,Props>(function ModelPicker({credentialId,value,onChange,onBlur,id,disabled,...aria},ref){
  const trpc=useTRPC(),uniqueId=useId();const popupId=`${uniqueId}-models`,customId=`${uniqueId}-custom`;
  const [open,setOpen]=useState(false),[search,setSearch]=useState(''),[query,setQuery]=useState('');
  useEffect(()=>{const timer=setTimeout(()=>setQuery(search.trim()),200);return()=>clearTimeout(timer);},[search]);
  const models=useQuery(trpc.credentials.models.queryOptions({credentialId,query},{enabled:open&&Boolean(credentialId)&&!disabled,staleTime:60000,retry:false}));
  const loading=models.isFetching||search.trim()!==query;
  return <div className="min-w-0 space-y-2">
    <Popover open={open} onOpenChange={next=>{setOpen(next);if(next){setSearch('');setQuery('');}else onBlur();}}>
      <PopoverTrigger asChild><Button ref={ref} type="button" id={id} role="combobox" variant="outline" aria-haspopup="dialog" aria-expanded={open} aria-controls={open?popupId:undefined} {...aria} disabled={disabled||!credentialId} className="h-11 w-full min-w-0 justify-between gap-3 font-normal"><span className="truncate">{value||(!credentialId?'Select an AI credential first':'Search and select a model')}</span><ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground"/></Button></PopoverTrigger>
      <PopoverContent id={popupId} align="start" aria-label="Choose an AI model" className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} maxLength={100} placeholder="Search model name or ID…" aria-label="Search provider models"/>
          <CommandList aria-busy={loading}>
            {loading?<div className="space-y-2 p-3" role="status" aria-label="Loading models"><Skeleton className="h-12"/><Skeleton className="h-12"/><Skeleton className="h-12"/></div>:models.isError?<div role="alert" className="space-y-3 p-4 text-sm"><p className="text-destructive">{models.error.message}</p><Button type="button" size="sm" variant="secondary" onClick={()=>models.refetch()}>Retry model list</Button></div>:!models.data?.models.length?<p role="status" className="p-4 text-sm text-muted-foreground">No models match. Refine the search or enter a custom model ID below.</p>:models.data.models.map(model=><CommandItem key={model.id} value={model.id} className="min-h-14 gap-3 px-3 py-3" onSelect={()=>{onChange(model.id);setOpen(false);onBlur();}}><div className="min-w-0 flex-1"><p className="break-words font-medium">{model.name}</p><p className="break-all text-xs text-muted-foreground">{model.id}</p><p className="text-xs text-muted-foreground">{model.kind==='inference-profile'?'Inference profile · ':''}{model.tools==='supported'?'Tool calling advertised':'Tool support not advertised'}</p></div>{value===model.id&&<Check aria-hidden="true" className="size-4 shrink-0"/>}</CommandItem>)}
          </CommandList>
          {!loading&&models.data&&<div className="space-y-2 border-t border-border px-3 py-2 text-xs text-muted-foreground"><p role="status">{models.data.total>40?'Showing the first 40 matches. Refine your search.':`${models.data.total} matching models`} · Provider catalog, not an invocation test.</p>{models.data.warnings.map(warning=><p key={warning}>{warning}</p>)}</div>}
        </Command>
      </PopoverContent>
    </Popover>
    {credentialId&&<details className="text-sm"><summary className="cursor-pointer py-1 text-muted-foreground">Enter a custom model ID</summary><div className="space-y-2 pt-2"><label htmlFor={customId} className="text-sm font-medium">Provider model or inference-profile ID</label><Input id={customId} value={value} onChange={event=>onChange(event.target.value.trim())} onBlur={onBlur} disabled={disabled} maxLength={512} placeholder="Exact model ID supplied by your provider" aria-describedby={`${customId}-help`}/><p id={`${customId}-help`} className="text-xs text-muted-foreground">Use this for private models or limited discovery permissions. The model must support tool calling and your account must have access.</p></div></details>}
  </div>;
});
