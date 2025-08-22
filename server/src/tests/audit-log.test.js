import { request } from './setup.js';
import nock from 'nock';

test('audit timeline present', async () => {
  const lr = await request.post('/api/auth/login').send({ 
    email: 'u@u.com', 
    password: 'pass123' 
  });
  const token = lr.body.token;

  nock('http://localhost:9000')
    .post('/triage')
    .reply(200, {
      predictedCategory: 'tech',
      draftReply: 'Check KB',
      citations: [],
      confidence: 0.7,
      modelInfo: { 
        provider: 'stub', 
        model: 'stub', 
        promptVersion: 'v1', 
        stubMode: true 
      },
      stepLogs: [{ 
        action: 'AGENT_CLASSIFIED', 
        meta: { predictedCategory: 'tech' } 
      }]
    });

  const r = await request.post('/api/tickets')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'error bug', 
      description: 'stack trace'
    });
  const ticketId = r.body.ticket._id;

  const audit = await request.get(`/api/tickets/${ticketId}/audit`)
    .set('Authorization', `Bearer ${token}`);
    
  expect(audit.statusCode).toBe(200);
  expect(audit.body.some(e => e.action === 'TICKET_CREATED')).toBe(true);
});
