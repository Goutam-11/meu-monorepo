import {afterAll,beforeEach,expect,mock,test} from 'bun:test';
import {NextRequest} from 'next/server';
mock.module('server-only',()=>({}));
let user='owner',deviceCount=0,updated=0,created=0,lookups=0;
mock.module('@/lib/auth/server',()=>({auth:{api:{getSession:async()=>({user:{id:user}})}}}));
mock.module('@/lib/db',()=>({default:{pushSubscription:{
  updateMany:async({where}:{where:{userId:string}})=>{expect(where.userId).toBe(user);lookups++;return {count:updated};},
  count:async({where}:{where:{userId:string}})=>{expect(where.userId).toBe(user);return deviceCount;},
  create:async()=>{created++;return {};},
}}}));
const {POST}=await import('../src/app/api/push/subscribe/route');
const point=Buffer.alloc(65);point[0]=4;
const valid={endpoint:'https://fcm.googleapis.com/fcm/send/test-device',keys:{p256dh:point.toString('base64url'),auth:Buffer.alloc(16).toString('base64url')}};
const request=(body:string,origin='http://localhost:3000')=>new NextRequest('http://localhost:3000/api/push/subscribe',{method:'POST',headers:{origin,'content-type':'application/json'},body});
beforeEach(()=>{user=`owner-${Math.random()}`;deviceCount=0;updated=0;created=0;lookups=0;});
afterAll(()=>mock.restore());
test('registration rejects excessive bodies without touching subscription storage',async()=>{
  const result=await POST(request('x'.repeat(8193)));
  expect(result.status).toBe(413);expect(lookups).toBe(0);expect(created).toBe(0);
});
test('registration requires the same origin',async()=>{
  expect((await POST(request(JSON.stringify(valid),'https://foreign.invalid'))).status).toBe(403);
  expect(lookups).toBe(0);
});
test('new devices are refused at the cap without deleting existing registrations',async()=>{
  deviceCount=10;
  const result=await POST(request(JSON.stringify(valid)));
  expect(result.status).toBe(409);expect(created).toBe(0);
  expect((await result.json()).error).toContain('Disable notifications on an old device');
});
test('existing devices can refresh at the cap',async()=>{
  deviceCount=10;updated=1;
  expect((await POST(request(JSON.stringify(valid)))).status).toBe(200);expect(created).toBe(0);
});
test('registration budgets reject more than ten attempts per user per minute',async()=>{
  updated=1;
  for(let i=0;i<10;i++)expect((await POST(request(JSON.stringify(valid)))).status).toBe(200);
  expect((await POST(request(JSON.stringify(valid)))).status).toBe(429);expect(lookups).toBe(10);
});
