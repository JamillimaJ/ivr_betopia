import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-betopia-navy text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-serif font-bold mb-4">Betopia Limited</h3>
            <p className="text-gray-300 mb-4">
              Global enterprise technology company providing innovative solutions for businesses worldwide.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-300 hover:text-betopia-orange transition-colors duration-300">
                <i className="fab fa-linkedin text-xl"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-betopia-orange transition-colors duration-300">
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a href="#" className="text-gray-300 hover:text-betopia-orange transition-colors duration-300">
                <i className="fab fa-facebook text-xl"></i>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://www.betopialimited.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-betopia-orange transition-colors duration-300">
                  About Us
                </a>
              </li>
              <li>
                <a href="https://www.betopialimited.com/services" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-betopia-orange transition-colors duration-300">
                  Services
                </a>
              </li>
              <li>
                <a href="https://www.betopialimited.com/contact" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-betopia-orange transition-colors duration-300">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start">
                <i className="fas fa-envelope mt-1 mr-2 text-betopia-orange"></i>
                <span>info@betopialimited.com</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-phone mt-1 mr-2 text-betopia-orange"></i>
                <span>+1 (404) 936-3567</span>
              </li>
              <li className="flex items-start">
                <i className="fas fa-map-marker-alt mt-1 mr-2 text-betopia-orange"></i>
                <span>Dhaka, Bangladesh</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Betopia Limited. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
