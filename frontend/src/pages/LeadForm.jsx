import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { qaLeadsAPI } from '../services/api';

const LeadForm = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    email: '',
    company_name: '',
    role: '',
    request: '',
    company_size: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await qaLeadsAPI.create(formData);
      setSubmitted(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          name: '',
          phone_number: '',
          email: '',
          company_name: '',
          role: '',
          request: '',
          company_size: '',
        });
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast.error('Submission Failed', 'Could not submit your enquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Hero Section with Navigation */}
      <nav className="bg-betopia-navy shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <img 
                src="/images/betopia-logo.png" 
                alt="Betopia Limited" 
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-betopia-navy mb-4">
            Let's <span className="text-betopia-orange">Transform</span> Your Business
          </h1>
          <p className="text-xl text-betopia-gray max-w-2xl mx-auto">
            Share your requirements with us, and our expert team will reach out to discuss how we can help you achieve your goals.
          </p>
        </div>

        {/* Form Card */}
        <div className="max-w-4xl mx-auto">
          <div className="card">
            {submitted ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
                  <i className="fas fa-check text-4xl text-green-600"></i>
                </div>
                <h3 className="text-3xl font-serif font-bold text-betopia-navy mb-4">Thank You!</h3>
                <p className="text-lg text-betopia-gray mb-4">
                  Your inquiry has been received successfully.
                </p>
                <p className="text-betopia-gray">
                  Our team will contact you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-serif font-bold text-betopia-navy mb-2">Get in Touch</h2>
                  <p className="text-betopia-gray">Fill out the form below and we'll be in touch soon</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-betopia-navy mb-2">
                      Full Name <span className="text-betopia-orange">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="phone_number" className="block text-sm font-semibold text-betopia-navy mb-2">
                      Phone Number <span className="text-betopia-orange">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone_number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="+880 1XXX-XXXXXX"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-betopia-navy mb-2">
                      Email Address <span className="text-betopia-orange">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="john@company.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="company_name" className="block text-sm font-semibold text-betopia-navy mb-2">
                      Company Name <span className="text-betopia-orange">*</span>
                    </label>
                    <input
                      type="text"
                      id="company_name"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Your Company Ltd."
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-semibold text-betopia-navy mb-2">
                      Your Role <span className="text-betopia-orange">*</span>
                    </label>
                    <input
                      type="text"
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="CEO, CTO, Manager"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="company_size" className="block text-sm font-semibold text-betopia-navy mb-2">
                      Company Size <span className="text-betopia-orange">*</span>
                    </label>
                    <select
                      id="company_size"
                      name="company_size"
                      value={formData.company_size}
                      onChange={handleChange}
                      className="select-field"
                      required
                    >
                      <option value="">Select company size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="request" className="block text-sm font-semibold text-betopia-navy mb-2">
                    How Can We Help You? <span className="text-betopia-orange">*</span>
                  </label>
                  <textarea
                    id="request"
                    name="request"
                    value={formData.request}
                    onChange={handleChange}
                    rows="5"
                    className="input-field resize-none"
                    placeholder="Tell us about your project, challenges, or requirements..."
                    required
                  ></textarea>
                </div>

                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary px-12 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane mr-2"></i>
                        Submit Inquiry
                      </>
                    )}
                  </button>
                </div>

                <p className="text-center text-sm text-betopia-gray mt-6">
                  <i className="fas fa-lock mr-1"></i>
                  Your information is secure and will be kept confidential
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadForm;
