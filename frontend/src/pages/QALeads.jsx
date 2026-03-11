import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { qaLeadsAPI } from '../services/api';

const QALeads = () => {
  const toast = useToast();
  const [leads, setLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, config: {}, onConfirm: null });
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    email: '',
    company_name: '',
    role: '',
    request: '',
    company_size: '',
  });

  const showConfirm = (config, onConfirm) => setConfirm({ open: true, config, onConfirm });
  const closeConfirm = () => setConfirm({ open: false, config: {}, onConfirm: null });

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const response = await qaLeadsAPI.getAll();
      setLeads(response.data.results || []);
    } catch (error) {
      console.error('Error loading QA leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLead = (leadId) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(new Set(leads.map(lead => lead.id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleMigrateSelected = async () => {
    if (selectedLeads.size === 0) return;

    showConfirm(
      {
        type: 'warning',
        title: 'Migrate to Production',
        message: `This will migrate ${selectedLeads.size} lead(s) to production and trigger AI calls. Continue?`,
        confirmLabel: 'Migrate & Call',
        cancelLabel: 'Cancel',
      },
      async () => {
        closeConfirm();
        setLoading(true);
        try {
          const response = await qaLeadsAPI.migrateToProduction(Array.from(selectedLeads));
          const { migrated, failed } = response.data;

          if (migrated.length > 0 && failed.length === 0) {
            toast.success('Migration Successful', `${migrated.length} lead(s) migrated and calls triggered.`);
          } else if (failed.length > 0) {
            toast.warning(
              `Partial Migration`,
              `Migrated: ${migrated.length} · Failed: ${failed.length} — ${failed.map(f => `${f.name}: ${f.reason}`).join(', ')}`
            );
          }

          setSelectedLeads(new Set());
          loadLeads();
        } catch (error) {
          console.error('Error migrating leads:', error);
          toast.error('Migration Failed', 'An error occurred. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const openAddModal = () => {
    setEditingLead(null);
    setFormData({
      name: '',
      phone_number: '',
      email: '',
      company_name: '',
      role: '',
      request: '',
      company_size: '',
    });
    setShowModal(true);
  };

  const openEditModal = (lead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      phone_number: lead.phone_number,
      email: lead.email,
      company_name: lead.company_name,
      role: lead.role,
      request: lead.request,
      company_size: lead.company_size,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingLead) {
        await qaLeadsAPI.update(editingLead.id, formData);
        toast.success('Lead Updated', `${formData.name}'s details have been saved.`);
      } else {
        await qaLeadsAPI.create(formData);
        toast.success('Lead Created', `${formData.name} has been added to QA leads.`);
      }
      setShowModal(false);
      loadLeads();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('Save Failed', 'Could not save the lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    showConfirm(
      {
        type: 'danger',
        title: 'Delete Lead',
        message: `Are you sure you want to delete ${lead?.name || 'this lead'}? This action cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
      },
      async () => {
        closeConfirm();
        setLoading(true);
        try {
          await qaLeadsAPI.delete(leadId);
          toast.success('Lead Deleted', `${lead?.name || 'Lead'} has been removed.`);
          loadLeads();
        } catch (error) {
          console.error('Error deleting lead:', error);
          toast.error('Delete Failed', 'Could not delete the lead. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <Navbar />
      
      <div className="flex-grow max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-betopia-navy mb-2">QA Leads</h1>
          <p className="text-betopia-gray">Review and manage leads before migration to production</p>
        </div>

        {/* Action Bar */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-sm text-betopia-gray">
              {selectedLeads.size > 0 && (
                <span className="font-semibold text-betopia-orange">{selectedLeads.size} lead(s) selected</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={openAddModal}
                className="btn-secondary text-sm"
              >
                <i className="fas fa-plus mr-2"></i>Add New Lead
              </button>
              <button
                onClick={handleMigrateSelected}
                disabled={selectedLeads.size === 0 || loading}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-rocket mr-2"></i>Migrate Selected ({selectedLeads.size})
              </button>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="card overflow-hidden">
          {loading && !showModal ? (
            <div className="text-center py-12">
              <i className="fas fa-spinner fa-spin text-4xl text-betopia-orange mb-4"></i>
              <p className="text-betopia-gray">Loading leads...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-betopia-light">
                  <tr>
                    <th className="table-header w-12">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedLeads.size === leads.length && leads.length > 0}
                        className="rounded border-gray-300 text-betopia-orange focus:ring-betopia-orange"
                      />
                    </th>
                    <th className="table-header">Name</th>
                    <th className="table-header">Phone</th>
                    <th className="table-header">Email</th>
                    <th className="table-header">Company</th>
                    <th className="table-header">Role</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12">
                        <i className="fas fa-inbox text-5xl text-gray-300 mb-4"></i>
                        <p className="text-betopia-gray">No leads found</p>
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="table-cell">
                          <input
                            type="checkbox"
                            checked={selectedLeads.has(lead.id)}
                            onChange={() => handleSelectLead(lead.id)}
                            className="rounded border-gray-300 text-betopia-orange focus:ring-betopia-orange"
                          />
                        </td>
                        <td className="table-cell font-medium text-betopia-navy">{lead.name}</td>
                        <td className="table-cell">{lead.phone_number}</td>
                        <td className="table-cell">{lead.email}</td>
                        <td className="table-cell">{lead.company_name}</td>
                        <td className="table-cell">{lead.role}</td>
                        <td className="table-cell text-right">
                          <button
                            onClick={() => openEditModal(lead)}
                            className="text-betopia-orange hover:text-betopia-navy mr-3 transition-colors duration-200"
                            title="Edit"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="text-red-500 hover:text-red-700 transition-colors duration-200"
                            title="Delete"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-serif font-bold text-betopia-navy">
                  {editingLead ? 'Edit Lead' : 'Add New Lead'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-betopia-navy mb-2">
                    Full Name <span className="text-betopia-orange">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-betopia-navy mb-2">
                    Phone Number <span className="text-betopia-orange">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-betopia-navy mb-2">
                    Email <span className="text-betopia-orange">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-betopia-navy mb-2">
                    Company Name <span className="text-betopia-orange">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-betopia-navy mb-2">
                    Role <span className="text-betopia-orange">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-betopia-navy mb-2">
                    Company Size <span className="text-betopia-orange">*</span>
                  </label>
                  <select
                    value={formData.company_size}
                    onChange={(e) => setFormData({...formData, company_size: e.target.value})}
                    className="input-field"
                    required
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201-500">201-500</option>
                    <option value="500+">500+</option>
                  </select>
                </div>
              </div>
              <div className="mt-6">
                <label className="block text-sm font-semibold text-betopia-navy mb-2">
                  Request/Inquiry <span className="text-betopia-orange">*</span>
                </label>
                <textarea
                  value={formData.request}
                  onChange={(e) => setFormData({...formData, request: e.target.value})}
                  rows="4"
                  className="input-field resize-none"
                  required
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingLead ? 'Update Lead' : 'Create Lead')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        {...confirm.config}
        onConfirm={confirm.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default QALeads;
