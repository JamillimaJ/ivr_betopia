import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-betopia-navy shadow-lg sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <img 
              src="/images/betopia-logo.png" 
              alt="Betopia Limited" 
              className="h-12 w-auto object-contain"
            />
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/lead-form"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive('/lead-form')
                  ? 'bg-betopia-orange text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <i className="fas fa-plus mr-2"></i>Submit Lead
            </Link>
            <Link
              to="/qa-leads"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive('/qa-leads')
                  ? 'bg-betopia-orange text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              QA Leads
            </Link>
            <Link
              to="/production-leads"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive('/production-leads')
                  ? 'bg-betopia-orange text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              Production
            </Link>
            <Link
              to="/call-summaries"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive('/call-summaries')
                  ? 'bg-betopia-orange text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              Outbound Calls
            </Link>
            <Link
              to="/inbound-calls"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive('/inbound-calls')
                  ? 'bg-betopia-orange text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <i className="fas fa-phone-alt mr-2"></i>Inbound Calls
            </Link>
            <button
              onClick={handleLogout}
              className="ml-4 px-6 py-2 bg-betopia-orange text-white rounded-lg font-medium hover:bg-opacity-90 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <i className="fas fa-sign-out-alt mr-2"></i>Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button className="text-gray-300 hover:text-white">
              <i className="fas fa-bars text-xl"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
