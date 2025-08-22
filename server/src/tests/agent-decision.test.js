import { request } from './setup.js';
import nock from 'nock';

test('waiting_human when below threshold', async () => {
  const lr = await request.post('/api/auth/login').send({ 
    email: 'u@u.com', 
    password: 'pass123' 
  });
  const token = lr.body.token;

  nock('http://localhost:9000')
    .post('/triage')
    .reply(200, {
      predictedCategory: 'other',
      draftReply: 'Not sure',
      citations: [],
      confidence: 0.2,
      modelInfo: { 
        provider: 'stub', 
        model: 'stub', 
        promptVersion: 'v1', 
        stubMode: true 
      },
      stepLogs: [{ 
        action: 'AGENT_CLASSIFIED', 
        meta: { predictedCategory: 'other' } 
      }]
    });

  const r = await request.post('/api/tickets')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Random', 
      description: 'hello world'
    });
    
  expect(r.body.ticket.status).toBe('waiting_human');
});
