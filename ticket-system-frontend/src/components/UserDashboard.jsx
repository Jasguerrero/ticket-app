import { useState, useEffect } from 'react';
import axios from 'axios';
import TicketDetail from './TicketDetail';

function UserDashboard({ user }) {
  const [tickets, setTickets] = useState([]);
  const [groups, setGroups] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('create'); // Default to create ticket view
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
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
      setSelectedAnnouncement(null);
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
      setSelectedAnnouncement(null);
      const response = await axios.get(`/tickets_user_closed/${user.id}`);
      setTickets(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch closed tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGroups = async () => {
    try {
      setLoading(true);
      setActiveTab('groups');
      setSelectedTicketId(null);
      setSelectedAnnouncement(null);
      
      // This assumes an API endpoint that returns all groups a user belongs to
      const response = await axios.get(`/users/${user.id}/groups`);
      setGroups(response.data);
      setError('');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // If 404, user has no groups, which is fine
        setGroups([]);
      } else {
        setError('Failed to fetch your groups');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAnnouncements = async () => {
    try {
      setLoading(true);
      setActiveTab('announcements');
      setSelectedTicketId(null);
      setSelectedAnnouncement(null);
      
      const response = await axios.get(`/users/${user.id}/announcements`);
      setAnnouncements(response.data);
      setError('');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        // If 404, user has no announcements, which is fine
        setAnnouncements([]);
      } else {
        setError('Failed to fetch announcements');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const showCreateTicket = () => {
    setActiveTab('create');
    setSelectedTicketId(null);
    setSelectedAnnouncement(null);
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

  const handleViewAnnouncementDetail = (announcement) => {
    setSelectedAnnouncement(announcement);
    
    // Mark announcement as read if it's not already
    if (!announcement.is_read) {
      markAnnouncementAsRead(announcement.id);
    }
  };

  const markAnnouncementAsRead = async (announcementId) => {
    try {
      await axios.post(`/announcements/${announcementId}/mark-read`, {
        user_id: user.id
      });
      
      // Update the local state to mark this announcement as read
      setAnnouncements(prev => 
        prev.map(ann => 
          ann.id === announcementId ? { ...ann, is_read: true } : ann
        )
      );
    } catch (err) {
      console.error('Failed to mark announcement as read:', err);
    }
  };

  const handleBackFromDetail = () => {
    setSelectedTicketId(null);
    setSelectedAnnouncement(null);
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
  
  // If an announcement is selected, show its details
  if (selectedAnnouncement) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={handleBackFromDetail}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Volver a anuncios
          </button>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">{selectedAnnouncement.title}</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {selectedAnnouncement.is_pinned && (
                    <span className="inline-flex items-center mr-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Fijado
                    </span>
                  )}
                  <span className="inline-flex items-center mr-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {selectedAnnouncement.group_name}
                  </span>
                  Publicado el {new Date(selectedAnnouncement.created_at).toLocaleDateString()} a las {new Date(selectedAnnouncement.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-900 whitespace-pre-line">
              {selectedAnnouncement.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <p className="mt-1 text-sm text-gray-500">
          Administra tickets de soporte
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
            Nuevo Ticket
          </button>
          <button
            onClick={fetchUserTickets}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'open'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tickets Pendientes
          </button>
          <button
            onClick={fetchClosedTickets}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'closed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tickets Cerrados
          </button>
          <button
            onClick={fetchUserGroups}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'groups'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Mis Grupos
          </button>
          <button
            onClick={fetchUserAnnouncements}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'announcements'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Anuncios
            {announcements.filter(a => !a.is_read).length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {announcements.filter(a => !a.is_read).length}
              </span>
            )}
          </button>
        </nav>
      </div>
      
      {/* Create Ticket Form */}
      {activeTab === 'create' && (
        <div className="bg-white shadow sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Crear nuevo ticket</h3>
            <div className="mt-5">
              <form onSubmit={handleCreateTicket}>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                      Categoria
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
                        <option value="">Selecciona categoria</option>
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="sub_category" className="block text-sm font-medium text-gray-700">
                      Subcategoria
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
                          <option value="">Selecciona subcategoria</option>
                          {newTicket.category && subcategoryMapping[newTicket.category]?.map((subCategory) => (
                            <option key={subCategory} value={subCategory}>{subCategory}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-6">
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Descripción
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
                        placeholder="Porfavor escribe tu problema en detalle..."
                      />
                    </div>
                  </div>
                </div>
                
                <div className="mt-5">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Crear Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      {/* Tickets display */}
      {(activeTab === 'open' || activeTab === 'closed') && loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (activeTab === 'open' || activeTab === 'closed') && tickets.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md py-12 px-4 text-center">
          <svg className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeTab === 'open' 
              ? "No tienes tickets pendientes en este momento." 
              : "No tienes tickets cerrados."}
          </p>
          {activeTab === 'closed' && (
            <div className="mt-6">
              <button
                onClick={showCreateTicket}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Crear un nuevo ticket
              </button>
            </div>
          )}
        </div>
      ) : (activeTab === 'open' || activeTab === 'closed') && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategoria</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado</th>
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
                        <span className="text-gray-400 italic">Sin asignar</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Groups display */}
      {activeTab === 'groups' && loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : activeTab === 'groups' && groups.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md py-12 px-4 text-center">
          <svg className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No perteneces a ningún grupo</h3>
          <p className="mt-1 text-sm text-gray-500">
            Contacta a tu profesor para ser agregado a un grupo.
          </p>
        </div>
      ) : activeTab === 'groups' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div 
              key={group.id} 
              className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-300"
              onClick={() => window.location.href = `/groups/${group.id}`}
            >
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 truncate">
                  {group.name}
                </h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500 line-clamp-3">
                  <p>{group.description || 'Sin descripción'}</p>
                </div>
                <div className="mt-3 flex items-center text-sm text-gray-500">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {group.unread_count > 0 ? `${group.unread_count} anuncios sin leer` : 'No hay anuncios sin leer'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Announcements display */}
      {activeTab === 'announcements' && loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : activeTab === 'announcements' && announcements.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-md py-12 px-4 text-center">
          <svg className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay anuncios</h3>
          <p className="mt-1 text-sm text-gray-500">
            No tienes anuncios para mostrar en este momento.
          </p>
        </div>
      ) : activeTab === 'announcements' && (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div 
              key={announcement.id} 
              className={`bg-white shadow overflow-hidden sm:rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-300 ${announcement.is_pinned ? 'border-l-4 border-blue-500' : ''} ${!announcement.is_read ? 'border-l-4 border-green-500' : ''}`}
              onClick={() => handleViewAnnouncementDetail(announcement)}
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 truncate">
                      {announcement.title}
                      {!announcement.is_read && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Nuevo
                        </span>
                      )}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 flex items-center">
                      <span className="mr-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {announcement.group_name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span className="text-xs text-gray-500">
                      {announcement.teacher_name}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500 line-clamp-2 whitespace-pre-line">
                  {announcement.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserDashboard;
