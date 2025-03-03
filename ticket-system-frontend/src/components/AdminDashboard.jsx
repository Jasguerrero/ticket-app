import { useState, useEffect } from 'react';
import axios from 'axios';
import TicketDetail from './TicketDetail'; // Reuse the same component

function AdminDashboard({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('assigned_open'); // Default to assigned open tickets
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  useEffect(() => {
    // Load assigned open tickets by default
    fetchAssignedOpenTickets();
  }, [user.id]);

  const fetchAssignedOpenTickets = async () => {
    try {
      setLoading(true);
      setActiveTab('assigned_open');
      setSelectedTicketId(null);
      const response = await axios.get(`/tickets_assign_open/${user.id}`);
      setTickets(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch assigned open tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedClosedTickets = async () => {
    try {
      setLoading(true);
      setActiveTab('assigned_closed');
      setSelectedTicketId(null);
      const response = await axios.get(`/tickets_assign_closed/${user.id}`);
      setTickets(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch assigned closed tickets');
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
    } catch (err) {
      setError('Failed to fetch unassigned tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToMe = async (ticketId) => {
    try {
      await axios.put(`/assign_ticket/${ticketId}`, { assign_id: user.id });
      
      // Refresh the current tab
      if (activeTab === 'unassigned') {
        fetchUnassignedTickets();
      } else {
        fetchAssignedOpenTickets();
      }
    } catch (err) {
      setError('Failed to assign ticket');
    }
  };

  // Removed handleCloseTicket - now handled in TicketDetail component

  const handleViewTicketDetail = (ticketId) => {
    // Only allow viewing details for tickets assigned to this admin
    const ticket = tickets.find(t => t.id === ticketId);
    
    if (ticket && ticket.assign_id === user.id) {
      setSelectedTicketId(ticketId);
    } else if (ticket && !ticket.assign_id) {
      // For unassigned tickets, don't allow viewing details
      setError('You must assign this ticket to yourself first before viewing details');
    }
  };

  const handleBackFromDetail = () => {
    setSelectedTicketId(null);
  };

  // If a ticket is selected, show its details
  if (selectedTicketId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TicketDetail 
          ticketId={selectedTicketId} 
          user={user} 
          onBack={handleBackFromDetail}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Administrar tickets de soporte
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
            onClick={fetchAssignedOpenTickets}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assigned_open'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Asignados
          </button>
          <button
            onClick={fetchAssignedClosedTickets}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assigned_closed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cerrados
          </button>
          <button
            onClick={fetchUnassignedTickets}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'unassigned'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sin Asignar
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
            {activeTab === 'assigned_open' 
              ? "You don't have any open tickets assigned to you." 
              : activeTab === 'assigned_closed'
                ? "You don't have any closed tickets."
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  {activeTab === 'unassigned' && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    className={`hover:bg-gray-50 ${ticket.assign_id === user.id ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (ticket.assign_id === user.id) {
                        handleViewTicketDetail(ticket.id);
                      }
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.sub_category || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{ticket.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ticket.status === 'open' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    {activeTab === 'unassigned' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            handleAssignToMe(ticket.id);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Assign to Me
                        </button>
                      </td>
                    )}
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

export default AdminDashboard;
