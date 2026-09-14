import { afterEach, expect, test, vi } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import instance from './axios';
import { csrfFetch } from './csrf';
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
const token=(value:string)=>new Response(JSON.stringify({csrfToken:value}));
test('fetch obtains fresh tokens for successive users and retries only explicit CSRF rejection',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(token('before')).mockResolvedValueOnce(new Response(JSON.stringify({code:'EBADCSRFTOKEN'}),{status:403})).mockResolvedValueOnce(token('after')).mockResolvedValueOnce(new Response('{}')).mockResolvedValueOnce(token('next-user')).mockResolvedValueOnce(new Response('{}'));
 vi.stubGlobal('fetch',fetcher);
 await csrfFetch('/api/auth/logout',{method:'POST',body:'{}'});
 await csrfFetch('/api/auth/login',{method:'POST',body:'{}'});
 expect(fetcher).toHaveBeenCalledTimes(6);
 for(const [call,value]of [[1,'before'],[3,'after'],[5,'next-user']] as const)expect(new Headers(fetcher.mock.calls[call][1].headers).get('x-csrf-token')).toBe(value);
});
test('fetch does not replay application failures or network failures',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(token('one')).mockResolvedValueOnce(new Response('{}',{status:500}));vi.stubGlobal('fetch',fetcher);
 expect((await csrfFetch('/api/stripe/create-checkout-session',{method:'POST',body:'{}'})).status).toBe(500);expect(fetcher).toHaveBeenCalledTimes(2);
 fetcher.mockReset().mockResolvedValueOnce(token('two')).mockRejectedValueOnce(new Error('offline'));
 await expect(csrfFetch('/api/auth/logout',{method:'POST'})).rejects.toThrow('offline');expect(fetcher).toHaveBeenCalledTimes(2);
});
test('Axios refreshes a stale token once without clearing authentication',async()=>{
 const clear=vi.spyOn(Storage.prototype,'clear');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(token('old')).mockResolvedValueOnce(token('fresh')));
 const seen:string[]=[];
 const adapter=vi.fn(async config=>{
  seen.push(String(config.headers.get('X-CSRF-Token')));
  if(seen.length===1)throw new AxiosError('CSRF',undefined,config,undefined,{status:403,statusText:'Forbidden',headers:new AxiosHeaders(),config,data:{code:'EBADCSRFTOKEN'}});
  return {status:200,statusText:'OK',headers:new AxiosHeaders(),config,data:{success:true}};
 });
 await instance.post('/auth/logout',{}, {adapter});
 expect(seen).toEqual(['old','fresh']);expect(clear).not.toHaveBeenCalled();
});
test('GET requests do not fetch tokens',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fetcher);
 await csrfFetch('/api/products');expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][0]).toBe('/api/products');
});
test('Axios uses the same cookie host as native login and CSRF requests',async()=>{
 const fetcher=vi.fn().mockResolvedValue(token('same-origin'));vi.stubGlobal('fetch',fetcher);
 let base;
 await instance.post('/auth/logout',{}, {adapter:async config=>{base=config.baseURL;return {status:200,statusText:'OK',headers:new AxiosHeaders(),config,data:{}};}});
 expect(base).toBe('/api');
 expect(fetcher.mock.calls[0][0]).toBe('/api/csrf-token');
});
