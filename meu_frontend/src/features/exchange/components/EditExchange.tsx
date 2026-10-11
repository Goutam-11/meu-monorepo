"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Switch } from "@/components/ui/switch";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Key, ShieldCheck, Landmark } from "lucide-react";
// Replace this with your actual mutation hook
import { useSuspenseExchange, useUpdateExchange } from "../hooks/use-exchange"; 

const BROKERS = ["BINANCE", "BYBIT", "KRAKEN", "KUCOIN", "DELTA", "ZERODHA"] as const;
const exchangeSchema = z.object({
  name: z.enum(BROKERS),
  displayName: z.string().trim().max(80),
  apiKey: z.string(),
  secret: z.string(),
  sandbox: z.boolean(),
});

type ExchangeFormValues = z.infer<typeof exchangeSchema>;

export default function EditExchangePage({ id }: { id: string }) {
  const { data:exchange } = useSuspenseExchange(id)
  const updateExchange = useUpdateExchange();

  const form = useForm<ExchangeFormValues>({
    resolver: zodResolver(exchangeSchema),
    defaultValues: {
      name: BROKERS.includes(exchange?.name as (typeof BROKERS)[number])
        ? (exchange?.name as (typeof BROKERS)[number])
        : "BINANCE",
      displayName: exchange?.displayName ?? "",
      apiKey: "",
      secret: "",
      sandbox: exchange?.sandbox ?? false,
    },
  });

  function onSubmit(values: ExchangeFormValues) {
    updateExchange.mutate({ ...values, id });
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Card className="border-none shadow-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Landmark className="h-6 w-6" />
            <CardTitle className="text-2xl">Connect Exchange</CardTitle>
          </div>
          <CardDescription>
            Integrate your exchange account to allow agents to execute trades and monitor balances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Exchange Id: {id}</p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Broker</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{["BINANCE", "BYBIT", "KRAKEN", "KUCOIN", "DELTA", "ZERODHA"].map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormDescription>
                      The exchange adapter used by this connection.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="displayName" render={({field}) => (
                <FormItem><FormLabel>Connection name</FormLabel><FormControl><Input placeholder="e.g. Delta main account" maxLength={80} {...field}/></FormControl><FormDescription>Optional label shown alongside the broker type.</FormDescription><FormMessage/></FormItem>
              )}/>

              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Key className="h-4 w-4" /> API Key
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Leave blank to keep the current key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" /> API Secret
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Leave blank to keep the current secret"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                      Your replacement secret is encrypted before it is stored.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-6">
                  
                <FormField
                  control={form.control}
                  name="sandbox"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Sandbox Mode</FormLabel>
                        <FormDescription>
                          Use testnet environment (no real funds involved).
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={updateExchange.isPending}
                >
                  {updateExchange.isPending ? "Updating..." : "Update Exchange Account"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  By connecting, you agree to allow the platform to access your account data as per your API permissions.
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
