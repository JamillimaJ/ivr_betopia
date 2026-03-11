import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { postCallSummariesAPI } from '../services/api';

const CallSummaries = () => {
  const toast = useToast();
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCallType, setFilterCallType] = useState('outbound');
  const [confirm, setConfirm] = useState({ open: false, config: {}, onConfirm: null });

  const showConfirm = (config, onConfirm) => setConfirm({ open: true, config, onConfirm });
  const closeConfirm = () => setConfirm({ open: false, config: {}, onConfirm: null });

  useEffect(() => {
    loadSummaries();
  }, [filterStatus, filterCallType]);

  const loadSummaries = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterCallType) params.call_type = filterCallType;
      
      const response = await postCallSummariesAPI.getAll(params);
      setSummaries(response.data.results || []);
    } catch (error) {
      console.error('Error loading call summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (summary) => {
    setSelectedSummary(summary);
    setShowDetailModal(true);
  };

  const handleDelete = (summaryId) => {
    const summary = summaries.find(s => s.id === summaryId);
    showConfirm(
      {
        type: 'danger',
        title: 'Delete Call Summary',
        message: `Are you sure you want to delete the summary for ${summary?.name || 'this record'}? This cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
      },
      async () => {
        closeConfirm();
        setLoading(true);
        try {
          await postCallSummariesAPI.delete(summaryId);
          toast.success('Summary Deleted', 'The call summary has been removed.');
          loadSummaries();
        } catch (error) {
          console.error('Error deleting summary:', error);
          toast.error('Delete Failed', 'Could not delete the summary. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      complete: { bg: 'bg-green-100', text: 'text-green-700', icon: 'fa-check-circle' },
      voicemail: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'fa-voicemail' },
      call_back: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'fa-phone-slash' },
      incorrect_phone: { bg: 'bg-red-100', text: 'text-red-700', icon: 'fa-exclamation-triangle' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', icon: 'fa-times-circle' },
    };
    
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', icon: 'fa-question-circle' };
    
    return (
      <span className={`px-3 py-1 ${config.bg} ${config.text} rounded-full text-xs font-medium`}>
        <i className={`fas ${config.icon} mr-1`}></i>
        {status?.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getCallTypeBadge = (callType) => {
    if (callType === 'inbound') {
      return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"><i className="fas fa-phone-alt mr-1"></i>Inbound</span>;
    }
    return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"><i className="fas fa-phone mr-1"></i>Outbound</span>;
  };

  const getIntentBadge = (intent) => {
    if (!intent || intent === 'N/A') return <span className="text-gray-400">-</span>;
    
    const intentColors = {
      'high': 'bg-green-100 text-green-700',
      'medium': 'bg-yellow-100 text-yellow-700',
      'low': 'bg-red-100 text-red-700',
    };
    
    const color = intentColors[intent.toLowerCase()] || 'bg-gray-100 text-gray-700';
    
    return (
      <span className={`px-3 py-1 ${color} rounded-full text-xs font-medium`}>
        {intent}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <Navbar />
      
      <div className="flex-grow max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-betopia-navy mb-2">Outbound Calls</h1>
          <p className="text-betopia-gray">View detailed outbound call results and qualification data</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Outbound', value: summaries.length, icon: 'fa-phone-arrow-up-right', color: 'text-betopia-orange' },
            { label: 'Complete', value: summaries.filter(s => s.status === 'complete').length, icon: 'fa-check-circle', color: 'text-green-500' },
            { label: 'High Intent', value: summaries.filter(s => s.intent?.toLowerCase() === 'high').length, icon: 'fa-fire', color: 'text-orange-500' },
            { label: 'Callback Needed', value: summaries.filter(s => s.status === 'call_back').length, icon: 'fa-phone-slash', color: 'text-blue-500' },
          ].map((stat) => (
            <div key={stat.label} className="card flex items-center gap-4 py-4">
              <i className={`fas ${stat.icon} text-2xl ${stat.color}`}></i>
              <div>
                <p className="text-sm text-betopia-gray">{stat.label}</p>
                <p className="text-2xl font-bold text-betopia-navy">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters & Actions */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="select-field-sm"
              >
                <option value="">All Statuses</option>
                <option value="complete">Complete</option>
                <option value="voicemail">Voicemail</option>
                <option value="call_back">Call Back</option>
                <option value="incorrect_phone">Incorrect Phone</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <button
              onClick={loadSummaries}
              className="btn-secondary text-sm"
              disabled={loading}
            >
              <i className={`fas fa-sync mr-2 ${loading ? 'fa-spin' : ''}`}></i>Refresh
            </button>
          </div>
        </div>

        {/* Summaries Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <i className="fas fa-spinner fa-spin text-4xl text-betopia-orange mb-4"></i>
              <p className="text-betopia-gray">Loading call summaries...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-betopia-light">
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Name</th>
                    <th className="table-header">Phone</th>
                    <th className="table-header">Company</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Intent</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summaries.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12">
                        <i className="fas fa-inbox text-5xl text-gray-300 mb-4"></i>
                        <p className="text-betopia-gray">No call summaries found</p>
                      </td>
                    </tr>
                  ) : (
                    summaries.map((summary) => (
                      <tr key={summary.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="table-cell">
                          {new Date(summary.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="table-cell font-medium text-betopia-navy">{summary.name}</td>
                        <td className="table-cell">{summary.phone}</td>
                        <td className="table-cell">{summary.company}</td>
                        <td className="table-cell">{summary.role || '—'}</td>
                        <td className="table-cell">{getStatusBadge(summary.status)}</td>
                        <td className="table-cell">{getIntentBadge(summary.intent)}</td>
                        <td className="table-cell text-right">
                          <button
                            onClick={() => handleViewDetails(summary)}
                            className="text-betopia-orange hover:text-betopia-navy mr-3 transition-colors duration-200"
                            title="View Details"
                          >
                            <i className="fas fa-eye mr-1"></i>View
                          </button>
                          <button
                            onClick={() => handleDelete(summary.id)}
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

      {/* Detail Modal */}
      {showDetailModal && selectedSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-serif font-bold text-betopia-navy">Call Summary Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Contact Info */}
              <div className="bg-betopia-light rounded-xl p-6">
                <h4 className="font-serif font-semibold text-lg text-betopia-navy mb-4 flex items-center">
                  <i className="fas fa-user-circle mr-2 text-betopia-orange"></i>
                  Contact Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Name</p>
                    <p className="font-medium text-betopia-navy">{selectedSummary.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Phone</p>
                    <p className="font-medium text-betopia-navy">{selectedSummary.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Email</p>
                    <p className="font-medium text-betopia-navy">{selectedSummary.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Company</p>
                    <p className="font-medium text-betopia-navy">{selectedSummary.company}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Role</p>
                    <p className="font-medium text-betopia-navy">{selectedSummary.role}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Company Size</p>
                    <p className="font-medium text-betopia-navy">{selectedSummary.company_size}</p>
                  </div>
                </div>
              </div>

              {/* Call Info */}
              <div className="bg-blue-50 rounded-xl p-6">
                <h4 className="font-serif font-semibold text-lg text-betopia-navy mb-4 flex items-center">
                  <i className="fas fa-phone mr-2 text-betopia-orange"></i>
                  Call Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Date</p>
                    <p className="font-medium text-betopia-navy">{new Date(selectedSummary.date).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Type</p>
                    <p className="font-medium text-betopia-navy capitalize">{selectedSummary.call_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Status</p>
                    <p className="font-medium text-betopia-navy capitalize">{selectedSummary.status?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Duration</p>
                    <p className="font-medium text-betopia-navy">{selectedSummary.call_duration ? `${selectedSummary.call_duration}s` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Ended Reason</p>
                    <p className="font-medium text-betopia-navy">{selectedSummary.ended_reason || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Qualification Data */}
              <div className="bg-green-50 rounded-xl p-6">
                <h4 className="font-serif font-semibold text-lg text-betopia-navy mb-4 flex items-center">
                  <i className="fas fa-clipboard-check mr-2 text-betopia-orange"></i>
                  Qualification Data
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-betopia-navy mb-1">Service Interest</p>
                      <p className="text-sm text-betopia-gray">{selectedSummary.service_interest || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-betopia-navy mb-1">Motivation</p>
                      <p className="text-sm text-betopia-gray">{selectedSummary.motivation || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-betopia-navy mb-1">Urgency</p>
                      <p className="text-sm text-betopia-gray">{selectedSummary.urgency || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-betopia-navy mb-1">Past Experience</p>
                      <p className="text-sm text-betopia-gray">{selectedSummary.past_experience || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-betopia-navy mb-1">Budget</p>
                      <p className="text-sm text-betopia-gray">{selectedSummary.budget || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-betopia-navy mb-1">Intent</p>
                      <p className="text-sm text-betopia-gray">{selectedSummary.intent || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Original Request */}
              <div className="bg-yellow-50 rounded-xl p-6">
                <h4 className="font-serif font-semibold text-lg text-betopia-navy mb-4 flex items-center">
                  <i className="fas fa-file-alt mr-2 text-betopia-orange"></i>
                  Original Request
                </h4>
                <p className="text-sm text-betopia-gray whitespace-pre-wrap">{selectedSummary.request}</p>
              </div>

              {/* Conversation Summary */}
              {selectedSummary.conv_summary && (
                <div className="bg-purple-50 rounded-xl p-6">
                  <h4 className="font-serif font-semibold text-lg text-betopia-navy mb-4 flex items-center">
                    <i className="fas fa-comments mr-2 text-betopia-orange"></i>
                    Conversation Transcript
                  </h4>
                  <div className="text-sm text-betopia-gray whitespace-pre-wrap max-h-64 overflow-y-auto bg-white p-4 rounded-lg border border-gray-200">
                    {selectedSummary.conv_summary}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
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

export default CallSummaries;
