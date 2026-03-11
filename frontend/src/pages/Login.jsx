import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to QA Leads
  if (isAuthenticated) {
    return <Navigate to="/qa-leads" replace />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const success = login(username, password);
    if (success) {
      navigate('/qa-leads');
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="/images/betopia-logo.png" 
                alt="Betopia Limited" 
                className="h-20 w-auto object-contain"
              />
            </div>
            <h1 className="text-3xl font-serif font-bold text-betopia-navy mb-2">Welcome Back</h1>
            <p className="text-betopia-gray">Sign in to access the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-betopia-navy mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-betopia-navy mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full btn-primary"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-betopia-gray">
              Demo credentials: <span className="font-semibold text-betopia-navy">admin / admin</span>
            </p>
          </div>

          <div className="mt-8 text-center">
            <a 
              href="/lead-form" 
              className="text-sm text-betopia-orange hover:text-betopia-navy transition-colors duration-300"
            >
              Submit a lead instead →
            </a>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-betopia-gray">
            © {new Date().getFullYear()} Betopia Limited. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
