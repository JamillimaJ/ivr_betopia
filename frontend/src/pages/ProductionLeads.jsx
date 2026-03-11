import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { productionLeadsAPI } from '../services/api';

const POLL_INTERVAL = 2000; // 0.5 seconds

const STATUS_CONFIG = {
  queued:       { bg: 'bg-yellow-100',  text: 'text-yellow-700',  icon: 'fa-clock',           label: 'Queued'      },
  ringing:      { bg: 'bg-blue-100',    text: 'text-blue-700',    icon: 'fa-phone-volume',    label: 'Ringing'     },
  'in-progress':{ bg: 'bg-indigo-100',  text: 'text-indigo-700',  icon: 'fa-circle-dot',      label: 'In Progress' },
  forwarding:   { bg: 'bg-purple-100',  text: 'text-purple-700',  icon: 'fa-forward',         label: 'Forwarding'  },
  ended:        { bg: 'bg-green-100',   text: 'text-green-700',   icon: 'fa-check-circle',    label: 'Ended'       },
  pending:      { bg: 'bg-gray-100',    text: 'text-gray-600',    icon: 'fa-hourglass-start', label: 'Pending'     },
  error:        { bg: 'bg-red-100',     text: 'text-red-700',     icon: 'fa-exclamation-circle', label: 'Error'    },
};

const ProductionLeads = () => {
  const toast = useToast();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [callStatuses, setCallStatuses] = useState({}); // { leadId: { status, callData } }
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStatusData, setSelectedStatusData] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, config: {}, onConfirm: null });
  const pollRef = useRef(null);

  const showConfirm = (config, onConfirm) => setConfirm({ open: true, config, onConfirm });
  const closeConfirm = () => setConfirm({ open: false, config: {}, onConfirm: null });

  // Refs so the interval always reads the latest state without stale closures
  const leadsRef = useRef([]);
  const callStatusesRef = useRef({});

  useEffect(() => { leadsRef.current = leads; }, [leads]);
  useEffect(() => { callStatusesRef.current = callStatuses; }, [callStatuses]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productionLeadsAPI.getAll({ call_type: 'outbound' });
      setLeads(response.data.results || []);
    } catch (error) {
      console.error('Error loading production leads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Single poll tick — uses refs so it always sees fresh state
  const pollOnce = useCallback(async () => {
    const currentLeads = leadsRef.current;
    const currentStatuses = callStatusesRef.current;

    const toCheck = currentLeads.filter(
      (l) => l.call_id && currentStatuses[l.id]?.status !== 'ended'
    );

    // All calls completed — stop polling
    if (toCheck.length === 0) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    await Promise.allSettled(
      toCheck.map(async (lead) => {
        try {
          const res = await productionLeadsAPI.checkCallStatus(lead.id);
          const status = res.data?.call_data?.status || res.data?.status || 'pending';
          setCallStatuses((prev) => ({
            ...prev,
            [lead.id]: { status, callData: res.data?.call_data || res.data },
          }));
        } catch {
          setCallStatuses((prev) => ({
            ...prev,
            [lead.id]: { status: 'error', callData: null },
          }));
        }
      })
    );
  }, []); // stable — only uses refs

  useEffect(() => {
    loadLeads();
  }, []);

  // Start polling when leads load; restart if leads list changes (e.g. after delete)
  useEffect(() => {
    clearInterval(pollRef.current);
    pollRef.current = null;

    if (leads.length === 0) return;

    pollOnce(); // immediate first check
    pollRef.current = setInterval(pollOnce, POLL_INTERVAL);

    return () => clearInterval(pollRef.current);
  }, [leads]);

  const handleDelete = (lead) => {
    showConfirm(
      {
        type: 'danger',
        title: 'Delete Production Lead',
        message: `Are you sure you want to delete ${lead.name}? This cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
      },
      async () => {
        closeConfirm();
        try {
          await productionLeadsAPI.delete(lead.id);
          setLeads((prev) => prev.filter((l) => l.id !== lead.id));
          setCallStatuses((prev) => {
            const next = { ...prev };
            delete next[lead.id];
            return next;
          });
          toast.success('Lead Deleted', `${lead.name} has been removed from production.`);
        } catch (error) {
          console.error('Error deleting lead:', error);
          toast.error('Delete Failed', 'Could not delete the lead. Please try again.');
        }
      }
    );
  };

  const handleViewDetails = (lead) => {
    setSelectedLead(lead);
    setSelectedStatusData(callStatuses[lead.id] || null);
    setShowDetailModal(true);
  };

  const getCallTypeBadge = (callType) => {
    if (callType === 'inbound') {
      return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"><i className="fas fa-phone-alt mr-1"></i>Inbound</span>;
    }
    return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"><i className="fas fa-phone mr-1"></i>Outbound</span>;
  };

  const getStatusCell = (lead) => {
    if (!lead.call_id) {
      const cfg = STATUS_CONFIG.pending;
      return (
        <span className={`inline-flex items-center px-3 py-1 ${cfg.bg} ${cfg.text} rounded-full text-xs font-medium`}>
          <i className={`fas ${cfg.icon} mr-1`}></i>{cfg.label}
        </span>
      );
    }

    const statusInfo = callStatuses[lead.id];
    if (!statusInfo) {
      return (
        <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">
          <i className="fas fa-spinner fa-spin mr-1"></i>Checking…
        </span>
      );
    }

    const { status } = statusInfo;

    if (status === 'ended') {
      return (
        <button
          onClick={() => handleViewDetails(lead)}
          className="inline-flex items-center px-3 py-1.5 bg-betopia-orange text-white rounded-lg text-xs font-semibold hover:bg-opacity-90 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <i className="fas fa-chart-bar mr-1.5"></i>View
        </button>
      );
    }

    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const isLive = ['ringing', 'in-progress', 'forwarding'].includes(status);
    return (
      <span className={`inline-flex items-center px-3 py-1 ${cfg.bg} ${cfg.text} rounded-full text-xs font-medium`}>
        <i className={`fas ${cfg.icon} mr-1 ${isLive ? 'animate-pulse' : ''}`}></i>{cfg.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      <Navbar />

      <div className="flex-grow max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-betopia-navy mb-2">Production Leads</h1>
          <p className="text-betopia-gray">Monitor active leads and live call statuses</p>
        </div>

        {/* Action Bar */}
        <div className="card mb-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-betopia-gray">
              <span className="font-semibold text-betopia-navy">{leads.length}</span> lead(s) in production
              {leads.some(l => l.call_id && callStatuses[l.id]?.status !== 'ended') && (
                <span className="ml-3 inline-flex items-center text-indigo-600 text-xs">
                  <i className="fas fa-circle-dot animate-pulse mr-1"></i>Live polling
                </span>
              )}
            </div>
            <button onClick={loadLeads} className="btn-secondary text-sm" disabled={loading}>
              <i className={`fas fa-sync mr-2 ${loading ? 'fa-spin' : ''}`}></i>Refresh
            </button>
          </div>
        </div>

        {/* Leads Table */}
        <div className="card overflow-hidden">
          {loading && leads.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-spinner fa-spin text-4xl text-betopia-orange mb-4"></i>
              <p className="text-betopia-gray">Loading production leads...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-betopia-light">
                  <tr>
                    <th className="table-header">Name</th>
                    <th className="table-header">Phone</th>
                    <th className="table-header">Company</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Status</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12">
                        <i className="fas fa-inbox text-5xl text-gray-300 mb-4 block"></i>
                        <p className="text-betopia-gray">No production leads found</p>
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="table-cell font-medium text-betopia-navy">{lead.name}</td>
                        <td className="table-cell">{lead.standardized_phone || lead.phone_number}</td>
                        <td className="table-cell">{lead.company_name}</td>
                        <td className="table-cell">{getCallTypeBadge(lead.call_type)}</td>
                        <td className="table-cell">{getStatusCell(lead)}</td>
                        <td className="table-cell text-right">
                          <button
                            onClick={() => handleDelete(lead)}
                            className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition-all duration-200"
                            title="Delete lead"
                          >
                            <i className="fas fa-trash mr-1.5"></i>Delete
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

      {/* Call Detail Modal */}
      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-serif font-bold text-betopia-navy">Call Details</h3>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors duration-200">
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Lead Info */}
              <div className="bg-betopia-light rounded-xl p-6">
                <h4 className="font-serif font-semibold text-lg text-betopia-navy mb-4">Lead Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ['Name', selectedLead.name],
                    ['Phone', selectedLead.standardized_phone || selectedLead.phone_number],
                    ['Email', selectedLead.email],
                    ['Company', selectedLead.company_name],
                    ['Role', selectedLead.role],
                    ['Call ID', selectedLead.call_id],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-sm text-betopia-gray mb-1">{label}</p>
                      <p className={`font-medium text-betopia-navy ${label === 'Call ID' ? 'font-mono text-xs' : ''}`}>{value || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Call Data */}
              {selectedStatusData?.callData && (
                <div className="bg-blue-50 rounded-xl p-6">
                  <h4 className="font-serif font-semibold text-lg text-betopia-navy mb-4">Call Results</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-betopia-gray mb-1">Status</p>
                      <p className="font-medium text-betopia-navy capitalize">{selectedStatusData.callData.status || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-betopia-gray mb-1">Duration</p>
                      <p className="font-medium text-betopia-navy">
                        {selectedStatusData.callData.duration ? `${selectedStatusData.callData.duration}s` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-betopia-gray mb-1">Ended Reason</p>
                      <p className="font-medium text-betopia-navy">{selectedStatusData.callData.endedReason || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-betopia-gray mb-1">Call Type</p>
                      <p className="font-medium text-betopia-navy capitalize">{selectedStatusData.callData.type || selectedLead.call_type || '—'}</p>
                    </div>
                    {selectedStatusData.callData.analysis && (
                      <div className="col-span-2">
                        <p className="text-sm text-betopia-gray mb-1">Summary</p>
                        <p className="font-medium text-betopia-navy text-sm leading-relaxed">
                          {selectedStatusData.callData.analysis.summary || '—'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button onClick={() => setShowDetailModal(false)} className="btn-secondary">Close</button>
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

export default ProductionLeads;

