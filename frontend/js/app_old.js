/**
 * Lead Qualifier Dashboard - Main JavaScript
 */

// API Configuration - Dynamically use current host
const API_BASE_URL = `http://${window.location.hostname}:8001/api`;

let selectedLeads = new Set();
let currentTab = 'qa';

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadQALeads();
    
    // Add form submit handler
    document.getElementById('lead-form').addEventListener('submit', handleLeadSubmit);
});

/**
 * Tab Switching
 */
function switchTab(tab) {
    currentTab = tab;
    
    // Hide all sections
    document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('[id$="-tab"]').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('text-gray-600');
    });
    
    // Show selected section
    const section = document.getElementById(`${tab}-section`);
    if (section) {
        section.classList.remove('hidden');
    }
    
    // Add active class to current tab
    const tabBtn = document.getElementById(`${tab}-tab`);
    if (tabBtn) {
        tabBtn.classList.add('bg-blue-500', 'text-white');
        tabBtn.classList.remove('text-gray-600');
    }
    
    // Load appropriate data
    if (tab === 'qa') {
        loadQALeads();
    } else if (tab === 'production') {
        loadProductionLeads();
    } else if (tab === 'postcall') {
        loadPostCallSummaries();
    }
}

/**
 * Load QA Leads
 */
async function loadQALeads() {
    try {
        const response = await fetch(`${API_BASE_URL}/qa-leads/`);
        const data = await response.json();
        
        const tbody = document.getElementById('qa-leads-tbody');
        tbody.innerHTML = '';
        
        if (data.results && data.results.length > 0) {
            data.results.forEach(lead => {
                const row = createQALeadRow(lead);
                tbody.appendChild(row);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">No leads found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading QA leads:', error);
        showToast('Error loading QA leads', 'error');
    }
}

/**
 * Create QA Lead Table Row
 */
function createQALeadRow(lead) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    
    tr.innerHTML = `
        <td class="px-6 py-4">
            <input type="checkbox" class="lead-checkbox rounded" value="${lead.id}" onchange="updateSelectedLeads()">
        </td>
        <td class="px-6 py-4 whitespace-nowrap">${lead.name}</td>
        <td class="px-6 py-4 whitespace-nowrap">${lead.phone_number}</td>
        <td class="px-6 py-4 whitespace-nowrap">${lead.email}</td>
        <td class="px-6 py-4 whitespace-nowrap">${lead.company_name}</td>
        <td class="px-6 py-4 whitespace-nowrap">${lead.role}</td>
        <td class="px-6 py-4 whitespace-nowrap">
            <button onclick="editLead(${lead.id})" class="text-blue-600 hover:text-blue-800 mr-3">
                <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteLead(${lead.id})" class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    return tr;
}

/**
 * Load Production Leads
 */
async function loadProductionLeads() {
    try {
        const response = await fetch(`${API_BASE_URL}/production-leads/`);
        const data = await response.json();
        
        const tbody = document.getElementById('production-leads-tbody');
        tbody.innerHTML = '';
        
        if (data.results && data.results.length > 0) {
            data.results.forEach(lead => {
                const row = createProductionLeadRow(lead);
                tbody.appendChild(row);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">No production leads found</td></tr>';
        }
    } catch (error) {
        console.error('Error loading production leads:', error);
        showToast('Error loading production leads', 'error');
    }
}

/**
 * Create Production Lead Table Row
 */
function createProductionLeadRow(lead) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    
    const callStatus = lead.call_triggered ? 
        '<span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Triggered</span>' :
        '<span class="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Pending</span>';
    
    tr.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">${lead.name}</td>
        <td class="px-6 py-4 whitespace-nowrap">${lead.standardized_phone || lead.phone_number}</td>
        <td class="px-6 py-4 whitespace-nowrap">${lead.company_name}</td>
        <td class="px-6 py-4 whitespace-nowrap">${callStatus}</td>
        <td class="px-6 py-4 whitespace-nowrap text-xs text-gray-500">${lead.call_id || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap space-x-2">
            ${lead.call_id ? `
                <button onclick="checkCallStatus(${lead.id})" class="text-blue-600 hover:text-blue-800">
                    <i class="fas fa-sync-alt mr-1"></i>Check Status
                </button>
            ` : ''}
            <button onclick="deleteProductionLead(${lead.id})" class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    return tr;
}

/**
 * Load Post-Call Summaries
 */
async function loadPostCallSummaries(status = '') {
    try {
        const url = status ? `${API_BASE_URL}/post-call-summaries/?status=${status}` : `${API_BASE_URL}/post-call-summaries/`;
        const response = await fetch(url);
        const data = await response.json();
        
        const container = document.getElementById('postcall-summaries');
        container.innerHTML = '';
        
        if (data.results && data.results.length > 0) {
            data.results.forEach(summary => {
                const card = createSummaryCard(summary);
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p class="text-center text-gray-500 py-8">No call summaries found</p>';
        }
    } catch (error) {
        console.error('Error loading post-call summaries:', error);
        showToast('Error loading call summaries', 'error');
    }
}

/**
 * Create Summary Card
 */
function createSummaryCard(summary) {
    const div = document.createElement('div');
    div.className = 'bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition';
    
    const statusColors = {
        'complete': 'bg-green-100 text-green-800',
        'voicemail': 'bg-yellow-100 text-yellow-800',
        'call_back': 'bg-blue-100 text-blue-800',
        'incorrect_phone': 'bg-red-100 text-red-800',
        'failed': 'bg-gray-100 text-gray-800'
    };
    
    const statusClass = statusColors[summary.status] || 'bg-gray-100 text-gray-800';
    
    div.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <div>
                <h3 class="text-lg font-semibold text-gray-800">${summary.name}</h3>
                <p class="text-sm text-gray-600">${summary.company}</p>
            </div>
            <div class="flex gap-2">
                <span class="px-3 py-1 ${summary.call_type === 'inbound' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'} rounded-full text-xs font-medium">
                    <i class="fas fa-${summary.call_type === 'inbound' ? 'phone-incoming' : 'phone-outgoing'} mr-1"></i>${summary.call_type || 'outbound'}
                </span>
                <span class="px-3 py-1 ${statusClass} rounded-full text-xs font-medium">${summary.status}</span>
            </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
                <p class="text-gray-500">Phone</p>
                <p class="font-medium">${summary.phone}</p>
            </div>
            <div>
                <p class="text-gray-500">Email</p>
                <p class="font-medium">${summary.email}</p>
            </div>
            <div>
                <p class="text-gray-500">Role</p>
                <p class="font-medium">${summary.role}</p>
            </div>
            <div>
                <p class="text-gray-500">Company Size</p>
                <p class="font-medium">${summary.company_size}</p>
            </div>
        </div>
        
        ${summary.status === 'complete' ? `
        <div class="border-t pt-4 space-y-3 text-sm">
            ${summary.conv_summary && summary.conv_summary !== 'N/A' ? `
            <div class="mb-4">
                <button 
                    onclick="toggleConversation(${summary.id})" 
                    class="flex items-center justify-between w-full text-left font-medium text-gray-700 hover:text-blue-600"
                >
                    <span><i class="fas fa-comments mr-2"></i>Full Conversation Transcript</span>
                    <i class="fas fa-chevron-down" id="chevron-${summary.id}"></i>
                </button>
                <div id="conversation-${summary.id}" class="hidden mt-3 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                    <pre class="text-xs whitespace-pre-wrap font-mono text-gray-800">${summary.conv_summary}</pre>
                </div>
            </div>
            ` : ''}
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-gray-500 font-medium">Service Interest</p>
                    <p>${summary.service_interest || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-gray-500 font-medium">Motivation</p>
                    <p>${summary.motivation || 'N/A'}</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-gray-500 font-medium">Urgency</p>
                    <p>${summary.urgency || 'N/A'}</p>
                </div>
                <div>
                    <p class="text-gray-500 font-medium">Budget</p>
                    <p>${summary.budget || 'N/A'}</p>
                </div>
            </div>
            <div>
                <p class="text-gray-500 font-medium">Past Experience</p>
                <p>${summary.past_experience || 'N/A'}</p>
            </div>
            <div>
                <p class="text-gray-500 font-medium">Intent</p>
                <p class="font-semibold ${summary.intent === 'High' ? 'text-green-600' : 'text-gray-600'}">${summary.intent || 'N/A'}</p>
            </div>
        </div>
        ` : ''}
        
        <div class="border-t pt-4 mt-4 flex justify-end">
            <button onclick="deletePostCallSummary(${summary.id})" class="text-red-600 hover:text-red-800 text-sm font-medium">
                <i class="fas fa-trash mr-1"></i>Delete Summary
            </button>
        </div>
    `;
    
    return div;
}

/**
 * Modal Functions
 */
function openAddLeadModal() {
    document.getElementById('modal-title').textContent = 'Add New Lead';
    document.getElementById('lead-form').reset();
    document.getElementById('lead-id').value = '';
    document.getElementById('lead-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('lead-modal').classList.add('hidden');
}

/**
 * Handle Lead Form Submit
 */
async function handleLeadSubmit(e) {
    e.preventDefault();
    
    const leadId = document.getElementById('lead-id').value;
    const formData = {
        name: document.getElementById('name').value,
        phone_number: document.getElementById('phone_number').value,
        email: document.getElementById('email').value,
        company_name: document.getElementById('company_name').value,
        role: document.getElementById('role').value,
        request: document.getElementById('request').value,
        company_size: document.getElementById('company_size').value,
        submitted_at: new Date().toISOString(),
        form_mode: 'test'
    };
    
    try {
        const url = leadId ? `${API_BASE_URL}/qa-leads/${leadId}/` : `${API_BASE_URL}/qa-leads/`;
        const method = leadId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            closeModal();
            loadQALeads();
            showToast(leadId ? 'Lead updated successfully' : 'Lead added successfully');
        } else {
            throw new Error('Failed to save lead');
        }
    } catch (error) {
        console.error('Error saving lead:', error);
        showToast('Error saving lead', 'error');
    }
}

/**
 * Edit Lead
 */
async function editLead(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/qa-leads/${id}/`);
        const lead = await response.json();
        
        document.getElementById('modal-title').textContent = 'Edit Lead';
        document.getElementById('lead-id').value = lead.id;
        document.getElementById('name').value = lead.name;
        document.getElementById('phone_number').value = lead.phone_number;
        document.getElementById('email').value = lead.email;
        document.getElementById('company_name').value = lead.company_name;
        document.getElementById('role').value = lead.role;
        document.getElementById('request').value = lead.request;
        document.getElementById('company_size').value = lead.company_size;
        
        document.getElementById('lead-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading lead:', error);
        showToast('Error loading lead', 'error');
    }
}

/**
 * Delete Lead
 */
async function deleteLead(id) {
    if (!confirm('Are you sure you want to delete this lead?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/qa-leads/${id}/`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadQALeads();
            showToast('Lead deleted successfully');
        } else {
            throw new Error('Failed to delete lead');
        }
    } catch (error) {
        console.error('Error deleting lead:', error);
        showToast('Error deleting lead', 'error');
    }
}

/**
 * Selection Functions
 */
function toggleSelectAll(checkbox) {
    const checkboxes = document.querySelectorAll('.lead-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checkbox.checked;
    });
    updateSelectedLeads();
}

function updateSelectedLeads() {
    const checkboxes = document.querySelectorAll('.lead-checkbox:checked');
    selectedLeads = new Set(Array.from(checkboxes).map(cb => parseInt(cb.value)));
    
    const migrateBtn = document.getElementById('migrate-btn');
    migrateBtn.disabled = selectedLeads.size === 0;
}

/**
 * Migrate Selected Leads
 */
async function migrateSelectedLeads() {
    if (selectedLeads.size === 0) {
        showToast('Please select leads to migrate', 'error');
        return;
    }
    
    if (!confirm(`Migrate ${selectedLeads.size} lead(s) to production and trigger calls?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/qa-leads/migrate_to_production/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                qa_lead_ids: Array.from(selectedLeads)
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            let message = `Successfully migrated ${data.total_migrated} lead(s).`;
            
            if (data.total_failed > 0) {
                message += ` Failed: ${data.total_failed}`;
                
                // Show details of failures
                if (data.failed && data.failed.length > 0) {
                    console.log('Failed migrations:', data.failed);
                    const failureDetails = data.failed.map(f => `${f.name}: ${f.reason}`).join('\n');
                    message += `\n\nFailure details:\n${failureDetails}`;
                }
                
                showToast(message, data.total_migrated > 0 ? 'warning' : 'error');
            } else {
                showToast(message);
            }
            
            selectedLeads.clear();
            document.getElementById('select-all-qa').checked = false;
            loadQALeads();
        } else {
            throw new Error('Migration failed');
        }
    } catch (error) {
        console.error('Error migrating leads:', error);
        showToast('Error migrating leads', 'error');
    }
}

/**
 * Check Call Status
 */
async function checkCallStatus(leadId) {
    try {
        const response = await fetch(`${API_BASE_URL}/production-leads/${leadId}/check_call_status/`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.status === 'completed') {
                showToast('Call completed! Summary saved.');
                loadProductionLeads();
            } else {
                showToast(`Call status: ${data.status}`);
            }
        } else {
            throw new Error('Failed to check call status');
        }
    } catch (error) {
        console.error('Error checking call status:', error);
        showToast('Error checking call status', 'error');
    }
}

/**
 * Delete Production Lead
 */
async function deleteProductionLead(id) {
    if (!confirm('Are you sure you want to delete this production lead?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/production-leads/${id}/`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadProductionLeads();
            showToast('Production lead deleted successfully');
        } else {
            throw new Error('Failed to delete production lead');
        }
    } catch (error) {
        console.error('Error deleting production lead:', error);
        showToast('Error deleting production lead', 'error');
    }
}

/**
 * Delete Post-Call Summary
 */
async function deletePostCallSummary(id) {
    if (!confirm('Are you sure you want to delete this call summary?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/post-call-summaries/${id}/`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadPostCallSummaries();
            showToast('Call summary deleted successfully');
        } else {
            throw new Error('Failed to delete call summary');
        }
    } catch (error) {
        console.error('Error deleting call summary:', error);
        showToast('Error deleting call summary', 'error');
    }
}

/**
 * Filter Summaries by Call Type and Status
 */
function filterSummaries() {
    const callType = document.getElementById('call-type-filter')?.value || '';
    const status = document.getElementById('status-filter')?.value || '';
    
    let url = `${API_BASE_URL}/post-call-summaries/?`;
    const params = [];
    
    if (callType) {
        params.push(`call_type=${callType}`);
    }
    if (status) {
        params.push(`status=${status}`);
    }
    
    url += params.join('&');
    
    loadPostCallSummariesFromUrl(url);
}

/**
 * Load Post Call Summaries from URL
 */
async function loadPostCallSummariesFromUrl(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const container = document.getElementById('postcall-summaries');
        container.innerHTML = '';
        
        if (data.results && data.results.length > 0) {
            data.results.forEach(summary => {
                const card = createSummaryCard(summary);
                container.appendChild(card);
            });
        } else {
            container.innerHTML = '<p class="text-center text-gray-500 py-8">No call summaries found</p>';
        }
    } catch (error) {
        console.error('Error loading post-call summaries:', error);
        showToast('Error loading call summaries', 'error');
    }
}

/**
 * Filter by Status (Legacy support)
 */
function filterByStatus(status) {
    loadPostCallSummaries(status);
}

/**
 * Toggle Conversation Display
 */
function toggleConversation(id) {
    const conversationDiv = document.getElementById(`conversation-${id}`);
    const chevron = document.getElementById(`chevron-${id}`);
    
    if (conversationDiv.classList.contains('hidden')) {
        conversationDiv.classList.remove('hidden');
        chevron.classList.remove('fa-chevron-down');
        chevron.classList.add('fa-chevron-up');
    } else {
        conversationDiv.classList.add('hidden');
        chevron.classList.remove('fa-chevron-up');
        chevron.classList.add('fa-chevron-down');
    }
}

/**
 * Toast Notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    const colors = {
        'success': 'bg-green-500',
        'error': 'bg-red-500',
        'warning': 'bg-yellow-500'
    };
    
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg ${colors[type] || colors.success} text-white max-w-md`;
    
    toastMessage.style.whiteSpace = 'pre-line';
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    
    // Longer timeout for longer messages
    const timeout = message.length > 100 ? 6000 : 3000;
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, timeout);
}
