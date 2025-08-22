import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { TicketsList } from './pages/TicketsList';
import { TicketDetail } from './pages/TicketDetail';
import { CreateTicket } from './pages/CreateTicket';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { KBEditor } from './pages/KBEditor';
import { Settings } from './pages/Settings';
import { useAuthStore } from './stores/auth';
import './utils/apiTest'; // Import the test function to make it available on window

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <div className="App">
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: '#10B981',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#EF4444',
              },
            },
          }}
        />

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/tickets" />} />
            <Route path="tickets" element={<TicketsList />} />
            <Route 
              path="tickets/new" 
              element={
                <ProtectedRoute roles={['user']}>
                  <CreateTicket />
                </ProtectedRoute>
              } 
            />
            <Route path="tickets/:id" element={<TicketDetail />} />
            
            <Route path="kb" element={<KnowledgeBase />} />
            <Route
              path="kb/new"
              element={
                <ProtectedRoute roles={['admin']}>
                  <KBEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="kb/:id/edit"
              element={
                <ProtectedRoute roles={['admin']}>
                  <KBEditor />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="settings"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;