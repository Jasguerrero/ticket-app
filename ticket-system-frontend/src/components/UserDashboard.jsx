import { useState, useEffect } from 'react';
import axios from 'axios';
import TicketDetail from './TicketDetail'; // Import the new TicketDetail component

function UserDashboard({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('create'); // Default to create ticket view
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [newTicket, setNewTicket] = useState({
    category: '',
    sub_category: '',
    description: ''
  });

  // Define categories and subcategories mapping
  const categoryOptions = [
    'CRUD',
    'SOPORTE TECNICO',
    'SEGURIDAD',
    'QUEJAS Y SUGERENCIAS'
  ];

  // Define subcategories based on selected category
  const subcategoryMapping = {
    'CRUD': ['CREATE', 'UPDATE', 'DELETE'],
    'SOPORTE TECNICO': ['BRIGHTSPACE', 'MY ESPACIO', 'TEAMS', 'ALTISIA'],
    'SEGURIDAD': ['INFRAESTRUCTURA', 'CONDUCTA SOCIAL'],
    'QUEJAS Y SUGERENCIAS': []
  };

  useEffect(() => {
    // Just load state, don't fetch tickets yet
    setLoading(false);
  }, [user.id]);

  const fetchUserTickets = async () => {
    try {
      setLoading(true);
      setActiveTab('open');
      setSelectedTicketId(null);
      const response = await axios.get(`/tickets_user_open/${user.id}`);
      setTickets(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch your tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchClosedTickets = async () => {
    try {
      setLoading(true);
      setActiveTab('closed');
      setSelectedTicketId(null);
      const response = await axios.get(`/tickets_user_closed/${user.id}`);
      setTickets(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch closed tickets');
    } finally {
      setLoading(false);
    }
  };

  const showCreateTicket = () => {
    setActiveTab('create');
    setSelectedTicketId(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If category changed, reset the subcategory
    if (name === 'category') {
      setNewTicket({
        ...newTicket,
        category: value,
        sub_category: ''
      });
    } else {
      setNewTicket({
        ...newTicket,
        [name]: value
      });
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      // Generate a random 5-character alphanumeric ID
      const generateTicketId = () => {
        let uuid;
        
        // Try using crypto.randomUUID() first (modern browsers)
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          uuid = crypto.randomUUID();
        } 
        // Fallback method for older browsers
        else {
          uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }
        
        // Extract the last 5 characters
        const id = uuid.slice(-5);
        
        return id;
      };
      
      // Prepare ticket data with proper subcategory handling
      const ticketData = {
        id: generateTicketId(),
        ...newTicket,
        // If category is QUEJAS Y SUGERENCIAS, explicitly set sub_category to null
        sub_category: newTicket.category === 'QUEJAS Y SUGERENCIAS' ? null : newTicket.sub_category,
        user_id: user.id,
        status: 'open'
      };
      
      await axios.post('/tickets', ticketData);
      setNewTicket({
        category: '',
        sub_category: '',
        description: ''
      });
      // After creating ticket, show the user's open tickets
      fetchUserTickets();
    } catch (err) {
      setError('Failed to create ticket');
    }
  };

  const handleViewTicketDetail = (ticketId) => {
    setSelectedTicketId(ticketId);
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
        <h1 className="text-2xl font-bold text-gray-900">User Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your support tickets
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
            onClick={showCreateTicket}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Create Ticket
          </button>
          <button
            onClick={fetchUserTickets}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'open'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Open Tickets
          </button>
          <button
            onClick={fetchClosedTickets}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'closed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Closed Tickets
          </button>
        </nav>
      </div>
      
      {/* Create Ticket Form */}
      {activeTab === 'create' && (
        <div className="bg-white shadow sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Create New Ticket</h3>
            <div className="mt-5">
              <form onSubmit={handleCreateTicket}>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <div className="mt-1">
                      <select
                        id="category"
                        name="category"
                        value={newTicket.category}
                        onChange={handleInputChange}
                        required
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      >
                        <option value="">Select a category</option>
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="sub_category" className="block text-sm font-medium text-gray-700">
                      Sub Category
                    </label>
                    <div className="mt-1">
                      {newTicket.category === 'QUEJAS Y SUGERENCIAS' ? (
                        <input
                          type="text"
                          name="sub_category"
                          id="sub_category"
                          value=""
                          disabled
                          className="bg-gray-100 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Not applicable"
                        />
                      ) : (
                        <select
                          id="sub_category"
                          name="sub_category"
                          value={newTicket.sub_category}
                          onChange={handleInputChange}
                          required={newTicket.category !== 'QUEJAS Y SUGERENCIAS'}
                          disabled={!newTicket.category || newTicket.category === 'QUEJAS Y SUGERENCIAS'}
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        >
                          <option value="">Select a subcategory</option>
                          {newTicket.category && subcategoryMapping[newTicket.category]?.map((subCategory) => (
                            <option key={subCategory} value={subCategory}>{subCategory}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-6">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="description"
                        name="description"
                        rows={4}
                        value={newTicket.description}
                        onChange={handleInputChange}
                        required
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-3"
                        placeholder="Please describe your issue in detail..."
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-5">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Tickets display */}
      {activeTab !== 'create' && loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : activeTab !== 'create' && tickets.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md py-12 px-4 text-center">
          <svg className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'open' 
              ? "You don't have any open tickets at the moment." 
              : "You don't have any closed tickets."}
          </p>
          {activeTab === 'closed' && (
            <div className="mt-6">
              <button
                onClick={showCreateTicket}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create a new ticket
              </button>
            </div>
          )}
        </div>
      ) : activeTab !== 'create' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr 
                    key={ticket.id} 
                    className="hover:bg-gray-50 cursor-pointer" 
                    onClick={() => handleViewTicketDetail(ticket.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.sub_category || '-'}</td>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.assign_id || (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
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

export default UserDashboard;
