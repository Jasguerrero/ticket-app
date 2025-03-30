import { useState, useEffect } from 'react';
import axios from 'axios';

function TicketDetail({ ticketId, user, onBack }) {
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    const fetchTicketAndComments = async () => {
      try {
        setLoading(true);
        
        // Fetch ticket details
        const ticketResponse = await axios.get(`/tickets/${ticketId}`);
        setTicket(ticketResponse.data);
        
        // Fetch comments
        const commentsResponse = await axios.get(`/tickets/${ticketId}/comments`);
        setComments(commentsResponse.data);
        
        setError('');
      } catch (err) {
        setError('Failed to load ticket details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketAndComments();
  }, [ticketId]);

  const handleCommentChange = (e) => {
    setNewComment(e.target.value);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      setCommentError('Comment cannot be empty');
      return;
    }
    
    try {
      setCommentError('');
      const response = await axios.post(`/tickets/${ticketId}/comments`, {
        user_id: user.id,
        content: newComment
      });
      
      // Add the new comment to the list
      setComments([...comments, response.data]);
      setNewComment('');
    } catch (err) {
      setCommentError(err.response?.data?.error || 'Failed to submit comment');
      console.error(err);
    }
  };

  const handleCloseTicket = async () => {
    try {
      await axios.put(`/close_ticket/${ticketId}`);
      
      // Refresh ticket data
      const ticketResponse = await axios.get(`/tickets/${ticketId}`);
      setTicket(ticketResponse.data);
    } catch (err) {
      setError('Failed to close ticket');
      console.error(err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-white shadow sm:rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-red-600">Error</h2>
          <button 
            onClick={onBack}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Tickets
          </button>
        </div>
        <p className="text-gray-800">{error || 'Ticket not found'}</p>
      </div>
    );
  }

  // Check if user is allowed to comment
  const canComment = user.user_role === 'user' 
    ? ticket.status === 'open' && ticket.user_id === user.id
    : ticket.assign_id === user.id;

  // Check if user can close the ticket
  const canCloseTicket = ticket.status === 'open' && 
    ((user.user_role !== 'user' && ticket.assign_id === user.id) || 
     (user.user_role === 'user' && ticket.user_id === user.id));

  return (
    <div className="bg-white shadow sm:rounded-lg">
      {/* Header with Back button and actions */}
      <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className="mr-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back
          </button>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Ticket #{ticket.id}</h3>
            <div className="mt-1 flex space-x-2">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                ticket.status === 'open' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {ticket.status}
              </span>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityBadgeColor(ticket.priority)}`}>
                {ticket.priority || 'Not set'}
              </span>
            </div>
          </div>
        </div>
        
        {canCloseTicket && ticket.status === 'open' && (
          <button
            onClick={handleCloseTicket}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Close Ticket
          </button>
        )}
      </div>
      
      {/* Compact Ticket Details */}
      <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Reported By</p>
            <p className="mt-1 text-sm text-gray-900">{ticket.user_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Category</p>
            <div className="mt-1">
              <p className="text-sm text-gray-900">{ticket.category}</p>
              {ticket.sub_category && <p className="text-xs text-gray-500">{ticket.sub_category}</p>}
            </div>
          </div>
          <div className="col-span-2">
            <p className="text-sm font-medium text-gray-500">Description</p>
            <p className="mt-1 text-sm text-gray-900">{ticket.description}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Created</p>
            <p className="mt-1 text-sm text-gray-900">{formatDate(ticket.created_at)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Last Updated</p>
            <p className="mt-1 text-sm text-gray-900">{formatDate(ticket.updated_at)}</p>
          </div>
          {ticket.closed_at && (
            <div className="col-span-2">
              <p className="text-sm font-medium text-gray-500">Closed</p>
              <p className="mt-1 text-sm text-gray-900">{formatDate(ticket.closed_at)}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Comments Section - The Most Important Part */}
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Comments</h3>
        
        {/* Add Comment Form - Put it on top for prominence if user can comment */}
        {canComment && ticket.status === 'open' && (
          <div className="mb-6 bg-gray-50 p-4 rounded-md">
            <form onSubmit={handleSubmitComment}>
              <div>
                <div className="mt-1">
                  <textarea
                    id="comment"
                    name="comment"
                    rows={3}
                    value={newComment}
                    onChange={handleCommentChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-3"
                    placeholder="Type your comment here..."
                  />
                </div>
                {commentError && (
                  <p className="mt-2 text-sm text-red-600">{commentError}</p>
                )}
              </div>
              <div className="mt-3">
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Submit Comment
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4">No comments yet</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between">
                  <h4 className="text-sm font-bold">{comment.user_name || "Test User"}</h4>
                  <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-gray-700">{comment.content}</p>
              </div>
            ))
          )}
        </div>
        
        {/* Notice if user cannot comment */}
        {!canComment && ticket.status === 'open' && (
          <div className="mt-6 p-4 bg-yellow-50 rounded-md">
            <p className="text-sm text-yellow-700">
              {user.user_role === 'user' 
                ? 'You can only comment on your own open tickets.' 
                : 'You can only comment on tickets assigned to you.'}
            </p>
          </div>
        )}
        
        {ticket.status !== 'open' && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-700">
              This ticket is closed. No new comments can be added.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketDetail;
