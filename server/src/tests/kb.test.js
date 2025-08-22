import { request } from './setup.js';

async function login(email, password='pass123') {
  const r = await request.post('/api/auth/login').send({ email, password });
  return r.body.token;
}

test('search KB returns published articles', async () => {
  const token = await login('u@u.com');
  const r = await request.get('/api/kb?query=error').set('Authorization', `Bearer ${token}`);
  expect(r.statusCode).toBe(200);
  expect(r.body.length).toBeGreaterThan(0);
});
