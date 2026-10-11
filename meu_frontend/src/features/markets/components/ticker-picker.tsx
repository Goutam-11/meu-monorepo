'use client';

import {forwardRef,useEffect,useId,useState,type AriaAttributes} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Check,ChevronsUpDown} from 'lucide-react';
import {useTRPC} from '@/trpc/client';
import {Button} from '@/components/ui/button';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Command,CommandInput,CommandList,CommandItem} from '@/components/ui/command';
import {Skeleton} from '@/components/ui/skeleton';

interface Props extends AriaAttributes {
  value:string;onChange:(value:string)=>void;onBlur?:()=>void;
  exchangeId?:string;venue?:'DELTA';scope:'CRYPTO'|'STOCKS';
  disabled?:boolean;name?:string;id?:string;exclude?:string[];
}
export const TickerPicker=forwardRef<HTMLButtonElement,Props>(function TickerPicker({value,onChange,onBlur,exchangeId,venue,scope,disabled=false,name,id,exclude=[],...aria},ref) {
  const trpc=useTRPC();const generatedId=useId();const popupId=`${generatedId}-markets`;
  const [open,setOpen]=useState(false),[search,setSearch]=useState(''),[query,setQuery]=useState('');
  useEffect(()=>{const timer=setTimeout(()=>setQuery(search.trim()),250);return()=>clearTimeout(timer);},[search]);
  const ready=Boolean(exchangeId||venue);
  const markets=useQuery(trpc.exchange.markets.queryOptions({exchangeId,venue,scope,query},{enabled:open&&ready&&!disabled,staleTime:60000,retry:false}));
  const searching=search.trim()!==query||markets.isFetching;
  const options=markets.data?.markets.filter(m=>m.value===value||!exclude.includes(m.value))??[];
  return <>
    {name&&<input type="hidden" name={name} value={value}/>}
    <Popover open={open} onOpenChange={next=>{setOpen(next);if(next){setSearch('');setQuery('');}else onBlur?.();}}>
      <PopoverTrigger asChild><Button ref={ref} id={id} type="button" variant="outline" role="combobox" aria-haspopup="dialog" aria-expanded={open} aria-controls={open?popupId:undefined} disabled={disabled||!ready} {...aria} className="h-11 w-full min-w-0 justify-between gap-3 font-normal">
        <span className="truncate">{value||(!ready?'Select an exchange first':'Search and select a ticker')}</span><ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground"/>
      </Button></PopoverTrigger>
      <PopoverContent id={popupId} align="start" aria-label="Choose a market ticker" className="w-[var(--radix-popover-trigger-width)] min-w-0 max-w-[calc(100vw-2rem)] p-0">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} maxLength={80} placeholder={scope==='STOCKS'?'Search symbol or company…':'Search symbol or asset…'} aria-label="Search available tickers"/>
          <CommandList aria-busy={searching}>
            {searching?<div className="space-y-2 p-3" role="status" aria-label="Loading tickers"><Skeleton className="h-10"/><Skeleton className="h-10"/><Skeleton className="h-10"/></div>:markets.isError?<div role="alert" className="space-y-2 p-4 text-sm"><p className="text-destructive">{markets.error.message}</p><Button type="button" variant="secondary" size="sm" onClick={()=>markets.refetch()}>Retry ticker list</Button></div>:!options.length?<p role="status" className="p-4 text-sm text-muted-foreground">No supported tickers match this search.</p>:options.map(m=><CommandItem key={m.value} value={m.value} onSelect={()=>{onChange(m.value);setOpen(false);onBlur?.();}} className="min-h-14 gap-3 px-3 py-3">
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline gap-x-2"><span className="font-semibold">{m.nativeSymbol}</span><span className="text-xs text-muted-foreground">{m.venue} · {m.kind==='equity'?'Equity':'Perpetual'} · {m.settlement}</span></div><p className="break-words text-xs text-muted-foreground">{m.name}{m.kind==='perpetual'?` · ${m.symbol} · contract ${m.contractSize}`:` · lot ${m.lotSize}`}</p></div>
              {value===m.value&&<Check aria-hidden="true" className="size-4 shrink-0"/>}
            </CommandItem>)}
          </CommandList>
          {!searching&&!markets.isError&&markets.data&&<p className="border-t border-border px-3 py-2 text-xs text-muted-foreground" role="status">{markets.data.total>30?'Showing the first 30 matches. Refine your search.':`${options.length} selectable tickers`} · Market metadata, not live quotes.</p>}
        </Command>
      </PopoverContent>
    </Popover>
  </>;
});
