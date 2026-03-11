import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { postCallSummariesAPI, inboundCallsAPI } from '../services/api';

const InboundCalls = () => {
  const toast = useToast();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [confirm, setConfirm] = useState({ open: false, config: {}, onConfirm: null });

  const showConfirm = (config, onConfirm) => setConfirm({ open: true, config, onConfirm });
  const closeConfirm = () => setConfirm({ open: false, config: {}, onConfirm: null });

  useEffect(() => {
    loadCalls();
  }, [filterStatus]);

  const loadCalls = async () => {
    setLoading(true);
    try {
      const params = { call_type: 'inbound' };
      if (filterStatus) params.status = filterStatus;
      const response = await postCallSummariesAPI.getAll(params);
      setCalls(response.data.results || []);
    } catch (error) {
      console.error('Error loading inbound calls:', error);
      toast.error('Load Failed', 'Could not load inbound call records.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await inboundCallsAPI.sync();
      const { synced, total } = response.data;
      if (synced > 0) {
        toast.success('Sync Complete', `Imported ${synced} of ${total} inbound call(s) from VAPI.`);
        loadCalls();
      } else {
        toast.info('Nothing New', `All ${total} call(s) are already up to date.`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync Failed', 'Could not fetch calls from VAPI. Check your API key and connection.');
    } finally {
      setSyncing(false);
    }
  };

  const handleViewDetails = (call) => {
    setSelectedCall(call);
    setShowDetailModal(true);
  };

  const handleDelete = (callId) => {
    const call = calls.find(c => c.id === callId);
    const displayName = call?.caller_name || call?.name || 'this record';
    showConfirm(
      {
        type: 'danger',
        title: 'Delete Inbound Call',
        message: `Are you sure you want to delete the record for ${displayName}? This cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
      },
      async () => {
        closeConfirm();
        setLoading(true);
        try {
          await postCallSummariesAPI.delete(callId);
          toast.success('Record Deleted', 'The inbound call record has been removed.');
          loadCalls();
        } catch (error) {
          console.error('Error deleting inbound call:', error);
          toast.error('Delete Failed', 'Could not delete the record. Please try again.');
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
        {status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
      </span>
    );
  };

  const getIntentBadge = (intent) => {
    if (!intent || intent === 'N/A') return <span className="text-gray-400">-</span>;
    const intentColors = {
      high: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-red-100 text-red-700',
    };
    const color = intentColors[intent.toLowerCase()] || 'bg-gray-100 text-gray-700';
    return (
      <span className={`px-3 py-1 ${color} rounded-full text-xs font-medium`}>
        {intent}
      </span>
    );
  };

  // Prefer caller_* fields (parsed from structured output), fall back to lead fields
  const displayName = (call) => call?.caller_name && call.caller_name !== 'N/A' ? call.caller_name : (call?.name || '-');
  const displayCompany = (call) => call?.caller_company && call.caller_company !== 'N/A' ? call.caller_company : (call?.company || '-');
  const displayRole = (call) => call?.caller_role && call.caller_role !== 'N/A' ? call.caller_role : (call?.role || '-');
  const displayEmail = (call) => call?.caller_email && call.caller_email !== 'N/A' ? call.caller_email : (call?.email || '-');
  const displayCompanySize = (call) => call?.caller_company_size && call.caller_company_size !== 'N/A' ? call.caller_company_size : (call?.company_size || '-');

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <Navbar />

      <div className="flex-grow max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-betopia-navy mb-2">Inbound Calls</h1>
          <p className="text-betopia-gray">Incoming caller records — identities parsed from structured AI outputs</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Inbound', value: calls.length, icon: 'fa-phone-arrow-down-left', color: 'text-betopia-orange' },
            { label: 'Complete', value: calls.filter(c => c.status === 'complete').length, icon: 'fa-check-circle', color: 'text-green-500' },
            { label: 'High Intent', value: calls.filter(c => c.intent?.toLowerCase() === 'high').length, icon: 'fa-fire', color: 'text-orange-500' },
            { label: 'Callback Needed', value: calls.filter(c => c.status === 'call_back').length, icon: 'fa-phone-slash', color: 'text-blue-500' },
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
            <div className="flex gap-3">
              <button
                onClick={handleSync}
                className="btn-primary text-sm"
                disabled={syncing}
              >
                <i className={`fas fa-cloud-download-alt mr-2 ${syncing ? 'fa-spin' : ''}`}></i>
                {syncing ? 'Syncing...' : 'Sync from VAPI'}
              </button>
              <button
                onClick={loadCalls}
                className="btn-secondary text-sm"
                disabled={loading}
              >
                <i className={`fas fa-sync mr-2 ${loading ? 'fa-spin' : ''}`}></i>Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Calls Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="text-center py-12">
              <i className="fas fa-spinner fa-spin text-4xl text-betopia-orange mb-4"></i>
              <p className="text-betopia-gray">Loading inbound calls...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-betopia-light">
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Caller Name</th>
                    <th className="table-header">Phone</th>
                    <th className="table-header">Company</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Intent</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calls.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-16">
                        <i className="fas fa-phone-slash text-5xl text-gray-300 mb-4 block"></i>
                        <p className="text-betopia-gray font-medium">No inbound calls found</p>
                        <p className="text-gray-400 text-sm mt-1">Inbound calls will appear here once received.</p>
                      </td>
                    </tr>
                  ) : (
                    calls.map((call) => (
                      <tr key={call.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="table-cell text-sm text-betopia-gray">
                          {new Date(call.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="table-cell font-medium text-betopia-navy">{displayName(call)}</td>
                        <td className="table-cell">{call.phone || '-'}</td>
                        <td className="table-cell">{displayCompany(call)}</td>
                        <td className="table-cell text-sm text-betopia-gray">{displayRole(call)}</td>
                        <td className="table-cell">{getStatusBadge(call.status)}</td>
                        <td className="table-cell">{getIntentBadge(call.intent)}</td>
                        <td className="table-cell text-right">
                          <button
                            onClick={() => handleViewDetails(call)}
                            className="text-betopia-orange hover:text-betopia-navy mr-3 transition-colors duration-200 text-sm"
                            title="View Details"
                          >
                            <i className="fas fa-eye mr-1"></i>View
                          </button>
                          <button
                            onClick={() => handleDelete(call.id)}
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
      {showDetailModal && selectedCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-betopia-navy">Inbound Call Details</h3>
                  <p className="text-sm text-betopia-gray mt-1">
                    <i className="fas fa-calendar-alt mr-1"></i>
                    {new Date(selectedCall.date).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Caller Identity — parsed from structured outputs */}
              <div className="bg-betopia-light rounded-xl p-6">
                <h4 className="font-serif font-semibold text-lg text-betopia-navy mb-4 flex items-center">
                  <i className="fas fa-user-circle mr-2 text-betopia-orange"></i>
                  Caller Identity
                  <span className="ml-3 px-2 py-0.5 bg-betopia-orange bg-opacity-10 text-betopia-orange text-xs rounded-full font-sans">
                    parsed from AI output
                  </span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Full Name</p>
                    <p className="font-medium text-betopia-navy">{displayName(selectedCall)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Phone</p>
                    <p className="font-medium text-betopia-navy">{selectedCall.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Email</p>
                    <p className="font-medium text-betopia-navy">{displayEmail(selectedCall)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Company</p>
                    <p className="font-medium text-betopia-navy">{displayCompany(selectedCall)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Role / Title</p>
                    <p className="font-medium text-betopia-navy">{displayRole(selectedCall)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Company Size</p>
                    <p className="font-medium text-betopia-navy">{displayCompanySize(selectedCall)}</p>
                  </div>
                </div>
              </div>

              {/* Call Information */}
              <div className="bg-blue-50 rounded-xl p-6">
                <h4 className="font-serif font-semibold text-lg text-betopia-navy mb-4 flex items-center">
                  <i className="fas fa-phone-alt mr-2 text-betopia-orange"></i>
                  Call Information
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Status</p>
                    <div>{getStatusBadge(selectedCall.status)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Duration</p>
                    <p className="font-medium text-betopia-navy">
                      {selectedCall.call_duration ? `${selectedCall.call_duration}s` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-betopia-gray mb-1">Ended Reason</p>
                    <p className="font-medium text-betopia-navy">{selectedCall.ended_reason || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Qualification Data */}
              <div className="bg-green-50 rounded-xl p-6">
                <h4 className="font-serif font-semibold text-lg text-betopia-navy mb-4 flex items-center">
                  <i className="fas fa-clipboard-check mr-2 text-betopia-orange"></i>
                  Qualification Data
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-betopia-navy mb-1">Service Interest</p>
                    <p className="text-sm text-betopia-gray">{selectedCall.service_interest || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-betopia-navy mb-1">Motivation</p>
                    <p className="text-sm text-betopia-gray">{selectedCall.motivation || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-betopia-navy mb-1">Urgency</p>
                    <p className="text-sm text-betopia-gray">{selectedCall.urgency || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-betopia-navy mb-1">Past Experience</p>
                    <p className="text-sm text-betopia-gray">{selectedCall.past_experience || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-betopia-navy mb-1">Budget</p>
                    <p className="text-sm text-betopia-gray">{selectedCall.budget || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-betopia-navy mb-1">Intent</p>
                    <div>{getIntentBadge(selectedCall.intent)}</div>
                  </div>
                </div>
              </div>

              {/* Original Request */}
              {selectedCall.request && (
                <div className="bg-yellow-50 rounded-xl p-6">
                  <h4 className="font-serif font-semibold text-lg text-betopia-navy mb-4 flex items-center">
                    <i className="fas fa-file-alt mr-2 text-betopia-orange"></i>
                    Original Request
                  </h4>
                  <p className="text-sm text-betopia-gray whitespace-pre-wrap">{selectedCall.request}</p>
                </div>
              )}

              {/* Conversation Transcript */}
              {selectedCall.conv_summary && (
                <div className="bg-purple-50 rounded-xl p-6">
                  <h4 className="font-serif font-semibold text-lg text-betopia-navy mb-4 flex items-center">
                    <i className="fas fa-comments mr-2 text-betopia-orange"></i>
                    Conversation Transcript
                  </h4>
                  <div className="text-sm text-betopia-gray whitespace-pre-wrap max-h-64 overflow-y-auto bg-white p-4 rounded-lg border border-gray-200">
                    {selectedCall.conv_summary}
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

export default InboundCalls;
