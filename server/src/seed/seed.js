import { connectDb } from '../db.js';
import { User } from '../models/User.js';
import { Article } from '../models/Article.js';
import { Ticket } from '../models/Ticket.js';
import { Config } from '../models/Config.js';
import { users, kb, tickets } from './data.js';

(async () => {
  await connectDb();
  await Promise.all([
    User.deleteMany({}), 
    Article.deleteMany({}), 
    Ticket.deleteMany({}), 
    Config.deleteMany({})
  ]);

  for (const u of users) {
    const user = new User({ name: u.name, email: u.email, role: u.role });
    await user.setPassword(u.password);
    await user.save();
  }
  
  await Article.insertMany(kb);

  const normalUser = await User.findOne({ role: 'user' });
  for (const t of tickets) {
    await Ticket.create({ ...t, createdBy: normalUser._id });
  }

  await new Config({}).save();
  console.log('Seeded.');
  process.exit(0);
})();
