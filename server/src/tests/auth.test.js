import { request } from './setup.js';

test('register & login', async () => {
  const r1 = await request.post('/api/auth/register').send({ 
    name: 'X', 
    email: 'x@x.com', 
    password: 'pass123' 
  });
  expect(r1.statusCode).toBe(200);
  
  const r2 = await request.post('/api/auth/login').send({ 
    email: 'x@x.com', 
    password: 'pass123' 
  });
  expect(r2.body.token).toBeDefined();
});
