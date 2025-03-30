import axios from 'axios';

// Generate a random ticket ID
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
  return uuid.slice(-5);
};

// Fetch open tickets for a user
export const fetchUserTickets = async (userId) => {
  try {
    const response = await axios.get(`/tickets_user_open/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching open tickets:', error);
    throw error;
  }
};

// Fetch closed tickets for a user
export const fetchClosedTickets = async (userId) => {
  try {
    const response = await axios.get(`/tickets_user_closed/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching closed tickets:', error);
    throw error;
  }
};

// Fetch groups for a user
export const fetchUserGroups = async (userId) => {
  try {
    const response = await axios.get(`/users/${userId}/groups`);
    return response.data;
  } catch (error) {
    // If 404, user has no groups, which is fine
    if (error.response && error.response.status === 404) {
      return [];
    }
    console.error('Error fetching user groups:', error);
    throw error;
  }
};

// Fetch announcements for a user
export const fetchUserAnnouncements = async (userId) => {
  try {
    const response = await axios.get(`/users/${userId}/announcements`);
    return response.data;
  } catch (error) {
    // If 404, user has no announcements, which is fine
    if (error.response && error.response.status === 404) {
      return [];
    }
    console.error('Error fetching announcements:', error);
    throw error;
  }
};

// Create a new ticket
export const createTicket = async (ticketData) => {
  try {
    // Add ticket ID and status to the data
    const ticketWithId = {
      id: generateTicketId(),
      ...ticketData,
      status: 'open'
    };
    
    const response = await axios.post('/tickets', ticketWithId);
    return response.data;
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw error;
  }
};

// Mark announcement as read
export const markAnnouncementAsRead = async (announcementId, userId) => {
  try {
    const response = await axios.post(`/announcements/${announcementId}/mark-read`, {
      user_id: userId
    });
    return response.data;
  } catch (error) {
    console.error('Error marking announcement as read:', error);
    throw error;
  }
};
