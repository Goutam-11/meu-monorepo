"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { credentialFields } from "../validation";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CredentialType } from "@/generated/prisma/enums";
import { KeyRound, BrainCircuit, Lock } from "lucide-react";
import { useEditCredential, useSuspenseCredential } from "@/features/credentials/hooks/use-credentials";

const credentialSchema = credentialFields.superRefine((value, context) => {
  if (value.type === CredentialType.AMAZON_BEDROCK && !/^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(value.region ?? ''))
    context.addIssue({code:'custom',path:['region'],message:'Enter an AWS region such as ap-south-1'});
 });

type CredentialFormValues = z.infer<typeof credentialSchema>;

export default function EditCredentialPage({ credentialId }: { credentialId: string }) {
  const { data:credential } = useSuspenseCredential(credentialId)
  const editCredential = useEditCredential();

  const form = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      type: credential?.type ?? CredentialType.OPENROUTER,
      displayName: credential?.displayName ?? "",
      region: credential?.region ?? "us-east-1",
      bedrockEndpoint: credential?.bedrockEndpoint === "mantle" ? "mantle" : "runtime",
      apiKey: "",
    },
  });

  // Watch type to provide contextual help
  const selectedType = useWatch({ control: form.control, name: "type" });

  function onSubmit(values: CredentialFormValues) {
    editCredential.mutate({ ...values, id: credentialId });
  }

  const getPlaceholder = (type: CredentialType) => {
    switch (type) {
      case CredentialType.OPENAI: return "sk-...";
      case CredentialType.ANTHROPIC: return "sk-ant-...";
      case CredentialType.OPENROUTER: return "sk-or-...";
      case CredentialType.NVIDIA_NIM: return "nvapi-...";
      case CredentialType.OPENCODE: return "Your OpenCode Zen API key";
      case CredentialType.AMAZON_BEDROCK: return "Your Amazon Bedrock API key";
      default: return "Enter your API key";
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 flex justify-center items-center h-full w-full">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2 text-accent-foreground mb-1">
            <BrainCircuit className="h-6 w-6" />
            <CardTitle className="text-2xl">LLM Credentials</CardTitle>
          </div>
          <CardDescription>
            Add API keys for AI providers to power your agent&apos;s intelligence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">Credential ID: {credentialId}</p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(CredentialType).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type === CredentialType.AMAZON_BEDROCK ? "Amazon Bedrock" : type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="displayName" render={({field}) => (
                <FormItem><FormLabel>Credential name</FormLabel><FormControl><Input placeholder="e.g. Bedrock research key" maxLength={80} {...field} value={field.value ?? ""}/></FormControl><FormDescription>Optional label shown alongside the provider type.</FormDescription><FormMessage/></FormItem>
              )}/>
              {selectedType === CredentialType.AMAZON_BEDROCK && <FormField control={form.control} name="bedrockEndpoint" render={({field}) => (
                <FormItem><FormLabel>Bedrock endpoint</FormLabel><Select value={field.value ?? "runtime"} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="mantle">Mantle · Chat Completions</SelectItem><SelectItem value="runtime">Runtime · Converse</SelectItem></SelectContent></Select><FormDescription>Choose the endpoint your key can use. Mantle uses IDs such as openai.gpt-oss-20b; Runtime uses its own model and inference-profile IDs. Re-select the model on linked agents after switching.</FormDescription><FormMessage/></FormItem>
              )}/>}
              {selectedType === CredentialType.AMAZON_BEDROCK && <FormField control={form.control} name="region" render={({field}) => (
                <FormItem><FormLabel>AWS region</FormLabel><FormControl><Input placeholder="ap-south-1" {...field} value={field.value ?? ""}/></FormControl><FormDescription>Use the region where your Bedrock model or inference profile is available. Enter a Bedrock API key, not an AWS access key ID.</FormDescription><FormMessage/></FormItem>
              )}/>}

              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4" /> Replacement API Key
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="password" 
                          placeholder={`Leave blank to keep the current key (${getPlaceholder(selectedType)})`}
                          className="pr-10"
                          {...field} 
                        />
                        <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Your key is used only to authenticate requests to {selectedType}.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={editCredential.isPending}
              >
                {editCredential.isPending ? "Editing..." : "Edit Credential"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
