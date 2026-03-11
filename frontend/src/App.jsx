import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import QALeads from './pages/QALeads';
import ProductionLeads from './pages/ProductionLeads';
import CallSummaries from './pages/CallSummaries';
import InboundCalls from './pages/InboundCalls';
import LeadForm from './pages/LeadForm';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/lead-form" element={<LeadForm />} />
          
          {/* Protected Routes */}
          <Route
            path="/qa-leads"
            element={
              <ProtectedRoute>
                <QALeads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/production-leads"
            element={
              <ProtectedRoute>
                <ProductionLeads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/call-summaries"
            element={
              <ProtectedRoute>
                <CallSummaries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inbound-calls"
            element={
              <ProtectedRoute>
                <InboundCalls />
              </ProtectedRoute>
            }
          />
          
          {/* Default Route */}
          <Route path="/" element={<Navigate to="/lead-form" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
export default App;
