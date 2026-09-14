const { test, mock, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
process.env.JWT_SECRET = 'test-only-jwt-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_only';
process.env.STRIPE_WEBHOOK_SECRET = 'test-only-webhook-key';
process.env.NODE_ENV = 'test';
const mongoose = require('mongoose');
mock.method(mongoose, 'connect', () => new Promise(() => {}));
const jwt = require('jsonwebtoken');
const express = require('express');
let app;
const captureExpress = Object.assign(function () { app = express(); return app; }, express);
require.cache[require.resolve('express')].exports = captureExpress;
const logs = [];
mock.method(console, 'log', (...args) => logs.push(args));
mock.method(console, 'error', (...args) => logs.push(args));
require('../src/index');
const User = require('../src/models/user.model').default;
const Product = require('../src/models/product.model').default;
const Order = require('../src/models/Order').default;
const server = http.createServer(app);
const ready = new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
after(() => new Promise(resolve => server.close(resolve)));
const admin = jwt.sign({id:'507f1f77bcf86cd799439011',email:'admin@example.test',role:'admin'},process.env.JWT_SECRET);
async function request(path, body, options={}) {
 await ready;
 const headers = {'Content-Type':'application/json', Origin:'https://www.eternalbotanic.com',Cookie:'token='+admin,...options.headers};
 if (!options.noCsrf && !['GET','HEAD','OPTIONS'].includes(options.method||'POST') && path !== '/api/stripe/webhook') {
  const bootstrap = await fetch('http://127.0.0.1:'+server.address().port+'/api/csrf-token', {headers:{Origin:'https://www.eternalbotanic.com',Cookie:headers.Cookie}});
  const token=(await bootstrap.json()).csrfToken;
  headers.Cookie += '; '+bootstrap.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
  headers['X-CSRF-Token']=token;
 }
 if (options.noOrigin) delete headers.Origin;
 const response = await fetch('http://127.0.0.1:'+server.address().port+path,{method:options.method||'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});
 return {status:response.status,text:await response.text(),cookie:response.headers.get('set-cookie')};
}
test('product reordering rejects operator objects before database access',async()=>{
 const call=mock.method(Product,'findByIdAndUpdate',async()=>null);
 try { const r=await request('/api/products/rearrange',{productIds:[{$ne:null}]},{method:'PATCH'});assert.equal(r.status,400);assert.equal(call.mock.callCount(),0); }finally{call.mock.restore();}
});
test('order creation rejects product operators before stock changes',async()=>{
 const call=mock.method(Product,'findOneAndUpdate',async()=>null);
 try {await request('/api/orders',{items:[{productId:{$ne:null},price:1,quantity:1}]});assert.equal(call.mock.callCount(),0);}finally{call.mock.restore();}
});
test('unsafe cookie requests reject hostile or missing origins before route handlers',async()=>{
 for(const options of [{headers:{Origin:'https://attacker.example'}},{noOrigin:true}]){
  const r=await request('/api/auth/logout',{},options);assert.equal(r.status,403);
 }
});
test('trusted-origin cookie writes still require a signed CSRF token',async()=>{
 const r=await request('/api/auth/logout',{}, {noCsrf:true});
 assert.equal(r.status,403);
});
test('authenticated responses and logs never expose cookie tokens',async()=>{
 logs.length=0;
 const r=await request('/api/auth/test-auth',undefined,{method:'GET'});
 assert.equal(r.status,200);assert.ok(!r.text.includes(admin));assert.ok(!JSON.stringify(logs).includes(admin));
});
test('Stripe rejects invalid signatures without reflecting exception HTML',async()=>{
 const r=await request('/api/stripe/webhook',{x:'<script>alert(1)</script>'},{noOrigin:true,headers:{'stripe-signature':'invalid'}});
 assert.equal(r.status,400);assert.equal(r.text,'Invalid webhook signature');
});
const Stripe = require('stripe');
const stripePrototype = Object.getPrototypeOf(new Stripe('sk_test_mock_only').checkout.sessions);
mock.method(require('https'), 'request', () => { throw new Error('External network forbidden in security tests'); });
test('checkout prices are loaded from catalog rather than submitted prices',async()=>{
 const lookup=mock.method(Product,'findById',async()=>({_id:'507f1f77bcf86cd799439012',name:'Serum',price:25,stock:5}));
 let checkout;
 const create=mock.method(stripePrototype,'create',async data=>{checkout=data;return {url:'https://checkout.stripe.test/session'};});
 try {const r=await request('/api/stripe/create-checkout-session',{items:[{id:'507f1f77bcf86cd799439012',name:'Fake',price:0.01,quantity:2}]});assert.equal(r.status,200);assert.equal(checkout.line_items[0].price_data.unit_amount,2500);assert.equal(checkout.line_items[0].price_data.product_data.name,'Serum');}finally{lookup.mock.restore();create.mock.restore();}
});
test('unpaid and other-user Stripe sessions cannot create paid orders',async()=>{
 const create=mock.method(Order,'create',async()=>({}));
 const find=mock.method(Order,'findById',async()=>null);
 const retrieve=mock.method(stripePrototype,'retrieve',async()=>({id:'cs_test',payment_status:'unpaid',metadata:{userId:'507f1f77bcf86cd799439011',items:JSON.stringify([{id:'507f1f77bcf86cd799439012',name:'Test',price:1,quantity:1}]),total:'1'}}));
 try {let r=await request('/api/stripe/session/cs_test',undefined,{method:'GET'});assert.equal(create.mock.callCount(),0);assert.equal(r.status,200);retrieve.mock.mockImplementation(async()=>({id:'cs_test',payment_status:'paid',metadata:{userId:'someone-else'}}));r=await request('/api/stripe/session/cs_test',undefined,{method:'GET'});assert.equal(r.status,404);}finally{create.mock.restore();find.mock.restore();retrieve.mock.restore();}
});
test('normal users cannot change order status',async()=>{
 const token=jwt.sign({id:'507f1f77bcf86cd799439011',email:'user@example.test',role:'user'},process.env.JWT_SECRET);
 const find=mock.method(Order,'findById',async()=>({save:async()=>{}}));
 try {const r=await request('/api/orders/another-order/status',{status:'paid'},{method:'PATCH',headers:{Cookie:'token='+token}});assert.equal(r.status,403);assert.equal(find.mock.callCount(),0);}finally{find.mock.restore();}
});
test('valid login uses an equality query and retains the HttpOnly session cookie',async()=>{
 const bcrypt=require('bcryptjs');const hash=await bcrypt.hash('ValidPassword1',4);
 const find=mock.method(User,'findOne',async()=>({_id:'507f1f77bcf86cd799439011',email:'user@example.test',name:'User',role:'user',password:hash}));
 try {logs.length=0;const r=await request('/api/auth/login',{email:'user@example.test',password:'ValidPassword1'});assert.equal(r.status,200);assert.deepEqual(find.mock.calls[0].arguments[0],{email:{$eq:'user@example.test'}});assert.match(r.cookie,/HttpOnly/);assert.match(r.cookie,/Secure/);assert.match(r.cookie,/SameSite=None/);assert.ok(!JSON.stringify(logs).includes(hash));}finally{find.mock.restore();}
});
test('signed Stripe events retain raw-body verification without browser origin',async()=>{
 const payload=JSON.stringify({id:'evt_test',type:'test.event',data:{object:{}}});
 const stripe=new Stripe('sk_test_mock_only');
 const signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});
 const r=await request('/api/stripe/webhook',JSON.parse(payload),{noOrigin:true,headers:{'stripe-signature':signature}});
 assert.equal(r.status,200);assert.deepEqual(JSON.parse(r.text),{received:true});
});
test('Cloudinary adapter streams uploads with original transformations and returns secure URL',async()=>{
 const cloudinary=require('cloudinary').v2;
 const {Writable,Readable}=require('node:stream');let options;let data='';
 const upload=mock.method(cloudinary.uploader,'upload_stream',(opts,done)=>{options=opts;return new Writable({write(chunk,encoding,cb){data+=chunk;cb();},final(cb){done(null,{secure_url:'https://res.cloudinary.com/test/image.png',public_id:'test-id',bytes:3});cb();}});});
 try {const storage=require('../src/config/cloudinary').storage;const info=await new Promise((resolve,reject)=>storage._handleFile({}, {stream:Readable.from(['png'])},(error,result)=>error?reject(error):resolve(result)));assert.equal(data,'png');assert.equal(info.path,'https://res.cloudinary.com/test/image.png');assert.deepEqual(options.allowed_formats,['jpg','jpeg','png','webp']);}finally{upload.mock.restore();}
});
test('direct order submissions cannot mutate inventory outside verified payment',async()=>{
 const stock=mock.method(Product,'findOneAndUpdate',async()=>({_id:'507f1f77bcf86cd799439012'}));
 const create=mock.method(Order,'create',async()=>{throw new Error('missing order id');});
 try {const r=await request('/api/orders',{items:[{productId:'507f1f77bcf86cd799439012',price:0.01,quantity:1}]});assert.equal(r.status,409);assert.equal(stock.mock.callCount(),0);assert.equal(create.mock.callCount(),0);}finally{stock.mock.restore();create.mock.restore();}
});
test('unpaid checkout webhooks acknowledge without creating paid orders',async()=>{
 const find=mock.method(Order,'findById',async()=>null);
 const create=mock.method(Order,'create',async()=>({_id:'cs_unpaid'}));
 const lines=mock.method(stripePrototype,'listLineItems',async()=>({data:[]}));
 const mail=require('../src/utils/mailer');const send=mock.method(mail,'sendReceiptEmail',async()=>{});
 try {const payload=JSON.stringify({id:'evt_unpaid',type:'checkout.session.completed',data:{object:{id:'cs_unpaid',payment_status:'unpaid',currency:'usd',metadata:{userId:'507f1f77bcf86cd799439011'}}}});const signature=new Stripe('sk_test_mock_only').webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});const r=await request('/api/stripe/webhook',JSON.parse(payload),{noOrigin:true,headers:{'stripe-signature':signature}});assert.equal(r.status,200);assert.equal(create.mock.callCount(),0);assert.equal(lines.mock.callCount(),0);assert.equal(send.mock.callCount(),0);}finally{find.mock.restore();create.mock.restore();lines.mock.restore();send.mock.restore();}
});
test('confirmed delayed-payment webhooks preserve accurate unit prices and order ownership',async()=>{
 const find=mock.method(Order,'findById',async()=>null);
 const create=mock.method(Order,'create',async data=>data);
 const lines=mock.method(stripePrototype,'listLineItems',async()=>({data:[{description:'Serum',quantity:2,amount_total:5000,price:{product:'prod_test'}}]}));
 const send=mock.method(require('../src/utils/mailer'),'sendReceiptEmail',async()=>{});
 try {const payload=JSON.stringify({id:'evt_paid',type:'checkout.session.async_payment_succeeded',data:{object:{id:'cs_paid',payment_status:'paid',amount_total:5000,currency:'usd',metadata:{userId:'507f1f77bcf86cd799439011'}}}});const signature=new Stripe('sk_test_mock_only').webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET});const r=await request('/api/stripe/webhook',JSON.parse(payload),{noOrigin:true,headers:{'stripe-signature':signature}});assert.equal(r.status,200);assert.equal(create.mock.callCount(),1);const order=create.mock.calls[0].arguments[0];assert.equal(order.status,'paid');assert.equal(order.userId,'507f1f77bcf86cd799439011');assert.equal(order.total,50);assert.equal(order.items[0].price,25);create.mock.mockImplementation(async()=>{throw new Error('database unavailable');});const retry=await request('/api/stripe/webhook',JSON.parse(payload),{noOrigin:true,headers:{'stripe-signature':signature}});assert.equal(retry.status,500);}finally{find.mock.restore();create.mock.restore();lines.mock.restore();send.mock.restore();}
});
function mergeCookies(cookie, response) {
 const jar=new Map(cookie.split(';').filter(Boolean).map(c=>{const [k,...v]=c.trim().split('=');return [k,v.join('=')];}));
 for(const c of response.headers.getSetCookie()){const [k,...v]=c.split(';')[0].split('=');if(v.join('='))jar.set(k,v.join('='));else jar.delete(k);}
 return [...jar].map(([k,v])=>k+'='+v).join('; ');
}
async function csrfBootstrap(cookie='') {
 await ready;const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/csrf-token',{headers:{Origin:'https://www.eternalbotanic.com',Cookie:cookie}});
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 return {cookie:mergeCookies(cookie,response),token:(await response.json()).csrfToken};
}
async function csrfWrite(path, body, state) {
 return fetch('http://127.0.0.1:'+server.address().port+path,{method:'POST',headers:{Origin:'https://www.eternalbotanic.com',Cookie:state.cookie,'X-CSRF-Token':state.token,'Content-Type':'application/json'},body:JSON.stringify(body)});
}
test('CSRF tokens reject forged values and different anonymous sessions',async()=>{
 const a=await csrfBootstrap(),b=await csrfBootstrap();
 let r=await csrfWrite('/api/auth/logout',{}, {cookie:a.cookie.replace(a.token,'forged'),token:'forged'});assert.equal(r.status,403);
 r=await csrfWrite('/api/auth/logout',{}, {cookie:b.cookie.replace(b.token,a.token),token:a.token});assert.equal(r.status,403);
 r=await csrfWrite('/api/auth/logout',{},a);assert.equal(r.status,200);
});
test('login and logout refresh session-bound CSRF tokens safely',async()=>{
 const bcrypt=require('bcryptjs');const hash=await bcrypt.hash('Password1',4);
 const find=mock.method(User,'findOne',async()=>({_id:'507f1f77bcf86cd799439011',email:'user@example.test',name:'User',role:'user',password:hash}));
 try {
  const anonymous=await csrfBootstrap();const login=await csrfWrite('/api/auth/login',{email:'user@example.test',password:'Password1'},anonymous);assert.equal(login.status,200);
  const authenticatedCookie=mergeCookies(anonymous.cookie,login);
  const stale=await csrfWrite('/api/auth/logout',{}, {cookie:authenticatedCookie,token:anonymous.token});assert.equal(stale.status,403);
  const authenticated=await csrfBootstrap(authenticatedCookie);assert.notEqual(authenticated.token,anonymous.token);
  const logout=await csrfWrite('/api/auth/logout',{},authenticated);assert.equal(logout.status,200);
  const afterLogout=await csrfBootstrap(mergeCookies(authenticated.cookie,logout));assert.notEqual(afterLogout.token,authenticated.token);
  assert.equal((await csrfWrite('/api/auth/logout',{},afterLogout)).status,200);
 }finally{find.mock.restore();}
});
test('token endpoint refuses hostile origins and supports same-origin Referer requests',async()=>{
 for(const headers of [{Origin:'https://attacker.example'},{Origin:'https://www.eternalbotanic.com.attacker.example'},{Referer:'https://attacker.example/page'},{}]){
  const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/csrf-token',{headers});assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);assert.ok(!(await r.text()).includes('csrfToken'));
 }
 const trusted=await fetch('http://127.0.0.1:'+server.address().port+'/api/csrf-token',{headers:{Referer:'https://www.eternalbotanic.com/login'}});assert.equal(trusted.status,200);
});
test('admin endpoints are covered by a bounded rate limiter',async()=>{
 const call=mock.method(Order,'find',()=>({sort:()=>({limit:async()=>[]})}));
 try {let blocked=false;for(let i=0;i<105;i++){const r=await request('/api/admin/orders',undefined,{method:'GET'});if(r.status===429){blocked=true;break;}}assert.equal(blocked,true);}finally{call.mock.restore();}
});
