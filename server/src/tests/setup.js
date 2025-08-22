import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../app.js';
import supertest from 'supertest';
import { User } from '../models/User.js';
import { Article } from '../models/Article.js';
import { Config } from '../models/Config.js';

export let app, request, mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = createApp();
  request = supertest(app);

  // seed minimal
  const admin = new User({ name: 'Admin', email: 'a@a.com', role: 'admin' }); 
  await admin.setPassword('pass123'); 
  await admin.save();
  
  const agent = new User({ name: 'Agent', email: 'g@g.com', role: 'agent' }); 
  await agent.setPassword('pass123'); 
  await agent.save();
  
  const user = new User({ name: 'User', email: 'u@u.com', role: 'user' }); 
  await user.setPassword('pass123'); 
  await user.save();
  
  await Article.insertMany([
    { title: 'Billing FAQ', body: 'refund invoice card', tags: ['billing'], status: 'published' },
    { title: 'Tech 500s', body: 'error bug stack', tags: ['tech'], status: 'published' }
  ]);
  
  await new Config({ autoCloseEnabled: true, confidenceThreshold: 0.5, slaHours: 24 }).save();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
