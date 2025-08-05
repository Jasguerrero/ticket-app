import { useState, useEffect } from 'react';
import TicketDetail from './TicketDetail';
import TicketForm from './TicketForm';
import TicketList from './TicketList';
import GroupList from './GroupList';
import GroupDetail from './GroupDetail';
import AnnouncementList from './AnnouncementList';
import AnnouncementDetail from './AnnouncementDetail';
import NavigationTabs from './NavigationTabs';
import { fetchUserTickets, fetchClosedTickets, fetchUserGroups, fetchUserAnnouncements, markAnnouncementAsRead as apiMarkAnnouncementAsRead } from '../api/userDataService';

function UserDashboard({ user }) {
  const [tickets, setTickets] = useState([]);
  const [groups, setGroups] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('create'); // Default to create ticket view
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // Function to handle tab changes
  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    setSelectedTicketId(null);
    setSelectedAnnouncement(null);
    setSelectedGroupId(null);
    
    if (tab === 'open') {
      await loadUserTickets();
    } else if (tab === 'closed') {
      await loadClosedTickets();
    } else if (tab === 'groups') {
      await loadUserGroups();
    } else if (tab === 'announcements') {
      await loadUserAnnouncements();
    }
  };

  // Load user tickets
  const loadUserTickets = async () => {
    try {
      setLoading(true);
      const data = await fetchUserTickets(user.id);
      setTickets(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch your tickets');
    } finally {
      setLoading(false);
    }
  };

  // Load closed tickets
  const loadClosedTickets = async () => {
    try {
      setLoading(true);
      const data = await fetchClosedTickets(user.id);
      setTickets(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch closed tickets');
    } finally {
      setLoading(false);
    }
  };

  // Load user groups
  const loadUserGroups = async () => {
    try {
      setLoading(true);
      const data = await fetchUserGroups(user.id);
      setGroups(data);
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

  // Load user announcements
  const loadUserAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await fetchUserAnnouncements(user.id);
      setAnnouncements(data);
      setError('');
    } finally {
      setLoading(false);
    }
  };

  // Handle ticket detail view
  const handleViewTicketDetail = (ticketId) => {
    setSelectedTicketId(ticketId);
  };

  // Handle announcement detail view
  const handleViewAnnouncementDetail = (announcement) => {
    setSelectedAnnouncement(announcement);
    
    // Mark announcement as read if it's not already
    if (!announcement.is_read) {
      markAnnouncementAsRead(announcement.id);
    }
  };

  // Handle group detail view
  const handleViewGroupDetail = (groupId) => {
    setSelectedGroupId(groupId);
  };

  // Mark announcement as read
  const markAnnouncementAsRead = async (announcementId) => {
    try {
      // Make API call to mark announcement as read
      await apiMarkAnnouncementAsRead(announcementId, user.id);
      
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

  // Handle back from detail view
  const handleBackFromDetail = () => {
    setSelectedTicketId(null);
    setSelectedAnnouncement(null);
    setSelectedGroupId(null);
  };

  // Handle ticket creation success
  const handleTicketCreated = () => {
    handleTabChange('open');
  };

  // Render ticket detail view
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
  
  // Render announcement detail view
  if (selectedAnnouncement) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnnouncementDetail 
          announcement={selectedAnnouncement}
          onBack={handleBackFromDetail}
        />
      </div>
    );
  }

  // Render group detail view
  if (selectedGroupId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GroupDetail 
          groupId={selectedGroupId}
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
          Administra tickets de soporte
        </p>
      </div>
      
      {/* Error display */}
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
      
      {/* Navigation Tabs */}
      <NavigationTabs 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        unreadAnnouncementsCount={announcements.filter(a => !a.is_read).length}
      />
      
      {/* Create Ticket Form */}
      {activeTab === 'create' && (
        <TicketForm 
          user={user} 
          onTicketCreated={handleTicketCreated} 
        />
      )}
      
      {/* Tickets List */}
      {(activeTab === 'open' || activeTab === 'closed') && (
        <TicketList 
          tickets={tickets} 
          loading={loading} 
          tabType={activeTab}
          onViewTicket={handleViewTicketDetail}
          onCreateTicket={() => handleTabChange('create')}
        />
      )}
      
      {/* Groups List */}
      {activeTab === 'groups' && (
        <GroupList 
          groups={groups} 
          loading={loading}
          onViewGroup={handleViewGroupDetail}
        />
      )}
      
      {/* Announcements List */}
      {activeTab === 'announcements' && (
        <AnnouncementList 
          announcements={announcements} 
          loading={loading} 
          onViewAnnouncement={handleViewAnnouncementDetail}
        />
      )}
    </div>
  );
}

export default UserDashboard;
