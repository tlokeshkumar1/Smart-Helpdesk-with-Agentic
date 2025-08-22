# Smart Helpdesk Frontend

A production-quality React frontend application for a Smart Helpdesk system with AI-powered ticket triage and agent assistance.

## Features

- **Authentication & Authorization**: JWT-based auth with refresh tokens, role-based access control (admin, agent, user)
- **Ticket Management**: Create, view, filter, and manage support tickets with real-time status updates
- **AI Agent Integration**: Displays AI suggestions for ticket categorization and draft replies
- **Knowledge Base**: Admin interface for managing help articles and documentation
- **Audit Trail**: Complete audit timeline for all ticket activities with trace IDs
- **Responsive Design**: Modern, accessible UI built with Tailwind CSS

## Tech Stack

- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: Zustand
- **HTTP Client**: Axios with interceptors
- **Testing**: Vitest + React Testing Library
- **Icons**: Lucide React

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Button, Input, Card, etc.)
│   ├── Layout.tsx      # Main app layout with navigation
│   └── ProtectedRoute.tsx # Route guards for role-based access
├── pages/              # Page components
│   ├── Login.tsx       # Authentication pages
│   ├── Register.tsx
│   ├── TicketsList.tsx # Ticket management
│   ├── TicketDetail.tsx
│   ├── CreateTicket.tsx
│   ├── KnowledgeBase.tsx # KB management (admin)
│   ├── KBEditor.tsx
│   └── Settings.tsx    # System configuration (admin)
├── stores/             # Zustand state stores
│   ├── auth.ts         # Authentication state
│   ├── tickets.ts      # Ticket management state
│   ├── kb.ts          # Knowledge base state
│   └── config.ts      # System configuration state
├── lib/               # Utilities
│   ├── api.ts         # Axios instance with interceptors
│   └── utils.ts       # Helper functions
├── types/             # TypeScript type definitions
└── __tests__/         # Test files
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Update `VITE_API_BASE` if your backend is not at `/api`

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Run tests**:
   ```bash
   npm run test
   ```

## User Roles & Permissions

- **User**: Can create tickets, view own tickets, read KB articles
- **Agent**: All user permissions + can reply to tickets, view all tickets, see agent suggestions
- **Admin**: All agent permissions + manage KB articles, configure system settings

## API Integration

The frontend communicates with the backend through these main endpoints:

- **Auth**: `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`
- **Tickets**: `/api/tickets` (CRUD operations)
- **Knowledge Base**: `/api/kb` (admin CRUD)
- **Configuration**: `/api/config` (admin settings)
- **Audit**: `/api/tickets/:id/audit` (activity logs)

## Key Features

### Intelligent Ticket Management
- Auto-categorization with AI confidence scores
- Agent suggestions with knowledge base citations
- Status tracking (open, assigned, waiting_human, closed)
- Comprehensive audit trails with trace IDs

### Role-Based Interface
- Dynamic navigation based on user permissions
- Protected routes and components
- Context-sensitive actions and views

### Real-Time Updates
- Automatic token refresh on expiry
- Optimistic UI updates
- Error handling with user-friendly messages

### Accessibility
- ARIA labels and keyboard navigation
- Focus management and screen reader support
- High contrast ratios and readable fonts

## Development Guidelines

### Component Development
- Use TypeScript for type safety
- Follow the established component patterns
- Include proper ARIA labels and keyboard support
- Write tests for complex logic

### State Management
- Use Zustand stores for global state
- Keep stores focused on single responsibilities
- Handle loading and error states consistently

### API Integration
- Use the configured Axios instance
- Handle errors gracefully with user feedback
- Implement proper loading states

### Testing
- Write unit tests for utility functions
- Test component behavior with user interactions
- Mock external dependencies appropriately

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment to any static hosting service.

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new features
3. Update documentation as needed
4. Ensure accessibility standards are met