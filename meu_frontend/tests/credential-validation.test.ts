import { test, expect } from 'bun:test';
import { credentialCreateSchema, credentialUpdateSchema } from '../src/features/credentials/validation';
test('Bedrock validates explicit region and key; rename can keep an existing encrypted key',()=>{
 const input={type:'AMAZON_BEDROCK',displayName:'  Research key  ',apiKey:'fixture',region:'ap-south-1'};
 expect(credentialCreateSchema.parse(input).displayName).toBe('Research key');
 for(const region of ['',undefined,'https://foreign.test','ap-south-1/path'])expect(credentialCreateSchema.safeParse({...input,region}).success).toBe(false);
 expect(credentialCreateSchema.safeParse({...input,apiKey:''}).success).toBe(false);
 expect(credentialCreateSchema.safeParse({...input,displayName:'a'.repeat(81)}).success).toBe(false);
 expect(credentialUpdateSchema.parse({...input,id:'id',apiKey:''}).apiKey).toBe('');
 expect(credentialCreateSchema.safeParse({type:'OPENAI',apiKey:'fixture'}).success).toBe(true);
});
