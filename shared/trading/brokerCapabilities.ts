/** Execution capabilities, rather than CCXT method availability alone. */
export function brokerCapabilities(name: string) {
  switch(name.toUpperCase()) {
    case 'DELTA': return {label:'Delta India',nativeStop:true,leverage:true,marginPreview:false,settlement:'USD',protection:'attached'} as const;
    case 'BINANCE': return {label:'Binance USD-M',nativeStop:true,leverage:true,marginPreview:false,settlement:'USDT',protection:'conditional'} as const;
    case 'ZERODHA': return {label:'Zerodha',nativeStop:false,leverage:false,marginPreview:true,settlement:'INR',protection:'none'} as const;
    default: return {label:name,nativeStop:false,leverage:false,marginPreview:false,settlement:undefined,protection:'none'} as const;
  }
}
