import { z } from 'zod';
import { CredentialType } from '@/generated/prisma/enums';

export const credentialFields = z.object({
  type: z.enum(CredentialType),
  displayName: z.string().trim().max(80).optional(),
  region: z.string().trim().max(40).optional(),
  bedrockEndpoint: z.enum(['runtime', 'mantle']).optional(),
  apiKey: z.string().trim().max(20000),
});
export const credentialCreateSchema = credentialFields.superRefine((value, context) => {
  if (!value.apiKey) context.addIssue({code:'custom',path:['apiKey'],message:'API key is required'});
  if (value.type === CredentialType.AMAZON_BEDROCK && !/^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(value.region ?? ''))
    context.addIssue({code:'custom',path:['region'],message:'Enter an AWS region such as ap-south-1'});
});
export const credentialUpdateSchema = credentialFields.extend({
  id: z.string(), apiKey: z.string().trim().max(20000).optional().default(''),
}).superRefine((value, context) => {
  if (value.type === CredentialType.AMAZON_BEDROCK && !/^[a-z]{2}(?:-[a-z]+)+-\d+$/.test(value.region ?? ''))
    context.addIssue({code:'custom',path:['region'],message:'Enter an AWS region such as ap-south-1'});
});
