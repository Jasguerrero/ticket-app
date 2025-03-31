import { useState, useEffect } from 'react';
import axios from 'axios';
import TicketDetail from './TicketDetail'; // Reuse the same component

function SuperUserDashboard({ user }) {
  const [tickets, setTickets] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all_open'); // Default to all open tickets
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [adminSelections, setAdminSelections] = useState({}); // Track admin selection per ticket
  const [prioritySelections, setPrioritySelections] = useState({}); // Track priority selection per ticket
  
  // Priority options with Spanish display names
  const priorityOptions = [
    { value: 'low', label: 'low' },
    { value: 'medium', label: 'medium' },
    { value: 'high', label: 'high' }
  ];

  useEffect(() => {
    // Load all open tickets by default
    fetchAllOpenTickets();
    // Fetch all admin users for assignment dropdown
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    try {
      const response = await axios.get('/admin_users');
      setAdminUsers(response.data);
    } catch (err) {
      setError('Failed to fetch admin users');
    }
  };

  const fetchAllOpenTickets = async () => {
    try {
      setLoading(true);
      setActiveTab('all_open');
      setSelectedTicketId(null);
      const response = await axios.get('/all_open_tickets');
      setTickets(response.data);
      setError('');
      
      // Initialize admin and priority selections with current values
      const adminSelects = {};
      const prioritySelects = {};
      response.data.forEach(ticket => {
        adminSelects[ticket.id] = ticket.assign_id || '';
        prioritySelects[ticket.id] = ticket.priority || 'medium';
      });
      setAdminSelections(adminSelects);
      setPrioritySelections(prioritySelects);
    } catch (err) {
      setError('Failed to fetch all open tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllClosedTickets = async () => {
    try {
      setLoading(true);
      setActiveTab('all_closed');
      setSelectedTicketId(null);
      const response = await axios.get('/all_closed_tickets');
      setTickets(response.data);
      setError('');
      
      // Initialize admin and priority selections with current values
      const adminSelects = {};
      const prioritySelects = {};
      response.data.forEach(ticket => {
        adminSelects[ticket.id] = ticket.assign_id || '';
        prioritySelects[ticket.id] = ticket.priority || 'medium';
      });
      setAdminSelections(adminSelects);
      setPrioritySelections(prioritySelects);
    } catch (err) {
      setError('Failed to fetch all closed tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedTickets = async () => {
    try {
      setLoading(true);
      setActiveTab('unassigned');
      setSelectedTicketId(null);
      const response = await axios.get('/tickets_not_assigned_open');
      setTickets(response.data);
      setError('');
      
      // Initialize admin and priority selections
      const adminSelects = {};
      const prioritySelects = {};
      response.data.forEach(ticket => {
        adminSelects[ticket.id] = '';
        prioritySelects[ticket.id] = ticket.priority || 'medium';
      });
      setAdminSelections(adminSelects);
      setPrioritySelections(prioritySelects);
    } catch (err) {
      setError('Failed to fetch unassigned tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminChange = (ticketId, adminId) => {
    setAdminSelections(prev => ({
      ...prev,
      [ticketId]: adminId
    }));
  };

  const handlePriorityChange = (ticketId, priority) => {
    setPrioritySelections(prev => ({
      ...prev,
      [ticketId]: priority
    }));
  };

  const handleAssignTicket = async (ticketId) => {
    const adminId = adminSelections[ticketId];
    if (!adminId) return;
    
    try {
      await axios.put(`/assign_ticket/${ticketId}`, { assign_id: adminId });
      
      // Refresh the current tab
      refreshCurrentTab();
    } catch (err) {
      setError('Failed to assign ticket');
    }
  };

  const handleUpdatePriority = async (ticketId) => {
    const priority = prioritySelections[ticketId];
    if (!priority) return;
    
    try {
      await axios.put(`/tickets-priority/${ticketId}`, { priority });
      
      // Refresh the current tab
      refreshCurrentTab();
    } catch (err) {
      setError('Failed to update ticket priority');
    }
  };

  const refreshCurrentTab = () => {
    if (activeTab === 'all_open') {
      fetchAllOpenTickets();
    } else if (activeTab === 'all_closed') {
      fetchAllClosedTickets();
    } else if (activeTab === 'unassigned') {
      fetchUnassignedTickets();
    }
  };

  const handleViewTicketDetail = (ticketId) => {
    setSelectedTicketId(ticketId);
  };

  const handleBackFromDetail = () => {
    setSelectedTicketId(null);
    // Refresh the current tab after returning from detail view
    refreshCurrentTab();
  };

  // Function to get admin name for display
  const getAdminName = (adminId) => {
    if (!adminId) return 'Not Assigned';
    const admin = adminUsers.find(a => a.id === adminId);
    return admin ? admin.user_name : 'Unknown';
  };

  // Helper function to get priority badge color
  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get priority display label
  const getPriorityLabel = (priority) => {
    const option = priorityOptions.find(opt => opt.value === priority);
    return option ? option.label : 'Not set';
  };

  // If a ticket is selected, show its details
  if (selectedTicketId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TicketDetail 
          ticketId={selectedTicketId} 
          user={user} 
          onBack={handleBackFromDetail}
          isSuperUser={true} // Pass flag to show super user capabilities in detail view
          adminUsers={adminUsers} // Pass admin users for reassignment in detail view
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Super User Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor all tickets and assign to any admin
        </p>
      </div>
      
      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={fetchAllOpenTickets}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all_open'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Open Tickets
          </button>
          <button
            onClick={fetchAllClosedTickets}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all_closed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Closed Tickets
          </button>
          <button
            onClick={fetchUnassignedTickets}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'unassigned'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Unassigned Tickets
          </button>
        </nav>
      </div>
      
      {/* Tickets display */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md py-12 px-4 text-center">
          <svg className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'all_open' 
              ? "There are no open tickets in the system." 
              : activeTab === 'all_closed'
                ? "There are no closed tickets in the system."
                : "There are no unassigned tickets available."}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Reported By</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Created</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Assigned To</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assign To</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    className="hover:bg-gray-50"
                  >
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                      onClick={() => handleViewTicketDetail(ticket.id)}
                    >
                      {ticket.id}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleViewTicketDetail(ticket.id)}
                    >
                      {ticket.user_name}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                      onClick={() => handleViewTicketDetail(ticket.id)}
                    >
                      <div className="flex flex-col">
                        <span>{ticket.category}</span>
                        {ticket.sub_category && <span className="text-xs text-gray-400">{ticket.sub_category}</span>}
                      </div>
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-24 cursor-pointer"
                      onClick={() => handleViewTicketDetail(ticket.id)}
                    >
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm w-24 cursor-pointer"
                      onClick={() => handleViewTicketDetail(ticket.id)}
                    >
                      <div className="flex flex-col space-y-1">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ticket.status === 'open' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {ticket.status}
                        </span>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityBadgeColor(ticket.priority)}`}>
                          {getPriorityLabel(ticket.priority)}
                        </span>
                      </div>
                    </td>
                    <td 
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 cursor-pointer w-28"
                      onClick={() => handleViewTicketDetail(ticket.id)}
                    >
                      {getAdminName(ticket.assign_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={adminSelections[ticket.id] || ''}
                          onChange={(e) => handleAdminChange(ticket.id, e.target.value)}
                          className="mr-2 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          disabled={ticket.status !== 'open'}
                        >
                          <option value="">Select Admin</option>
                          {adminUsers.map(admin => (
                            <option key={admin.id} value={admin.id}>{admin.user_name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAssignTicket(ticket.id)}
                          disabled={!adminSelections[ticket.id] || ticket.status !== 'open'}
                          className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                        >
                          Assign
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={prioritySelections[ticket.id] || 'medium'}
                          onChange={(e) => handlePriorityChange(ticket.id, e.target.value)}
                          className="mr-2 rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          disabled={ticket.status !== 'open'}
                        >
                          {priorityOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleUpdatePriority(ticket.id)}
                          disabled={
                            prioritySelections[ticket.id] === ticket.priority || 
                            ticket.status !== 'open'
                          }
                          className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                        >
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperUserDashboard;
