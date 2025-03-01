import { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('unassigned'); // Default to unassigned tab

  useEffect(() => {
    // Load unassigned tickets by default
    fetchUnassignedTickets();
  }, []);

  const fetchAllTickets = async () => {
    try {
      setLoading(true);
      setActiveTab('all');
      const response = await axios.get('/tickets');
      setTickets(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedTickets = async () => {
    try {
      setLoading(true);
      setActiveTab('unassigned');
      const response = await axios.get('/tickets_not_assigned_open');
      setTickets(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch unassigned tickets');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMyAssignedTickets = async () => {
    try {
      setLoading(true);
      setActiveTab('assigned');
      const response = await axios.get(`/tickets_assign_open/${user.id}`);
      setTickets(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch your assigned tickets');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchMyClosedTickets = async () => {
    try {
      setLoading(true);
      setActiveTab('closed');
      const response = await axios.get(`/tickets_assign_closed/${user.id}`);
      setTickets(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch your closed tickets');
    } finally {
      setLoading(false);
    }
  };

  const assignTicket = async (ticketId) => {
    try {
      await axios.put(`/assign_ticket/${ticketId}`, {
        assign_id: user.id
      });
      // Refresh tickets after assignment
      if (activeTab === 'all') {
        fetchAllTickets();
      } else {
        fetchUnassignedTickets();
      }
    } catch (err) {
      setError('Failed to assign ticket');
    }
  };

  const closeTicket = async (ticketId) => {
    try {
      await axios.put(`/close_ticket/${ticketId}`);
      // Refresh tickets after closing
      if (activeTab === 'all') {
        fetchAllTickets();
      } else {
        fetchUnassignedTickets();
      }
    } catch (err) {
      setError('Failed to close ticket');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage support tickets and assignments
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
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
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
          <button
            onClick={fetchMyAssignedTickets}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assigned'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Assigned Tickets
          </button>
          <button
            onClick={fetchMyClosedTickets}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'closed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Closed Tickets
          </button>
          <button
            onClick={fetchAllTickets}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Tickets
          </button>
        </nav>
      </div>
      
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
            {activeTab === 'unassigned' && "There are no unassigned tickets at the moment."}
            {activeTab === 'assigned' && "You don't have any assigned tickets currently."}
            {activeTab === 'closed' && "You haven't closed any tickets yet."}
            {activeTab === 'all' && "There are no tickets in the system yet."}
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{ticket.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ticket.status === 'open' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.user_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.assign_id || (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {!ticket.assign_id && (
                          <button
                            onClick={() => assignTicket(ticket.id)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Assign to Me
                          </button>
                        )}
                        {ticket.status === 'open' && (
                          <button
                            onClick={() => closeTicket(ticket.id)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Close
                          </button>
                        )}
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

export default AdminDashboard;
