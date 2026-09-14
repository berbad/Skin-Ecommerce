import { render, fireEvent, waitFor } from '@testing-library/react';
import { vi, test, expect } from 'vitest';
import LoginPage from '../app/(auth)/login/page';
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
test('login obtains a credentialed CSRF token before submitting credentials',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({csrfToken:'test-csrf'}))).mockResolvedValueOnce(new Response(JSON.stringify({success:true})));
 vi.stubGlobal('fetch',fetcher);
 const {container}=render(<LoginPage/>);
 fireEvent.change(container.querySelector('input[type=email]')!,{target:{value:'user@example.test'}});
 fireEvent.change(container.querySelector('input[type=password]')!,{target:{value:'Password1'}});
 fireEvent.submit(container.querySelector('form')!);
 await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));
 expect(String(fetcher.mock.calls[0][0])).toContain('/api/csrf-token');
 expect(fetcher.mock.calls[0][1].credentials).toBe('include');
 expect(new Headers(fetcher.mock.calls[1][1].headers).get('x-csrf-token')).toBe('test-csrf');
 vi.unstubAllGlobals();
});
