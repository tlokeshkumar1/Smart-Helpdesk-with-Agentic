# Smart Helpdesk API Server

A Node.js/Express backend for an intelligent helpdesk system with AI-powered ticket triage.

## Features

- **User Authentication**: JWT-based auth with role-based access control
- **Ticket Management**: Create, track, and manage support tickets
- **AI Triage**: Automatic ticket categorization and response generation
- **Knowledge Base**: Searchable articles and documentation
- **Audit Logging**: Complete audit trail for all actions
- **Rate Limiting**: Protection against abuse
- **Real-time Processing**: Immediate ticket triage on creation

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB:**
   ```bash
   docker run -d -p 27017:27017 mongo:7
   ```

4. **Seed the database:**
   ```bash
   npm run seed
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh JWT token

### Tickets
- `GET /api/tickets` - List tickets (with filters)
- `POST /api/tickets` - Create new ticket (triggers AI triage)
- `GET /api/tickets/:id` - Get ticket details
- `POST /api/tickets/:id/reply` - Agent reply to ticket
- `POST /api/tickets/:id/assign` - Assign ticket to agent

### Knowledge Base
- `GET /api/kb` - Search knowledge base articles
- `POST /api/kb` - Create new article (admin only)
- `PUT /api/kb/:id` - Update article (admin only)
- `DELETE /api/kb/:id` - Delete article (admin only)

### System
- `GET /api/healthz` - Health check
- `GET /api/config` - Get system configuration (admin only)
- `PUT /api/config` - Update system configuration (admin only)
- `GET /api/tickets/:id/audit` - Get ticket audit trail

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

## Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# API will be available at http://localhost:8080
```

## Environment Variables

See `.env.example` for all available configuration options.

## Architecture

- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **JWT** - Authentication tokens
- **Joi** - Request validation
- **Pino** - Structured logging
- **Jest** - Testing framework

## AI Integration

The system integrates with an AI agent worker that provides:
- Automatic ticket categorization
- Knowledge base search and matching
- Draft response generation
- Confidence scoring for auto-resolution
