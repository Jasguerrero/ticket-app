import { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        // Get all tickets for admin view
        const response = await axios.get('/tickets');
        setTickets(response.data);
      } catch (err) {
        setError('Failed to fetch tickets');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const fetchUnassignedTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/tickets_not_assigned_open');
      setTickets(response.data);
    } catch (err) {
      setError('Failed to fetch unassigned tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/tickets');
      setTickets(response.data);
    } catch (err) {
      setError('Failed to fetch all tickets');
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
      fetchAllTickets();
    } catch (err) {
      setError('Failed to assign ticket');
    }
  };

  if (loading) {
    return <div>Loading tickets...</div>;
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">Admin Dashboard</h2>
      
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <button 
          onClick={fetchAllTickets} 
          className="btn btn-primary me-2"
        >
          View All Tickets
        </button>
        <button 
          onClick={fetchUnassignedTickets} 
          className="btn btn-success"
        >
          View Unassigned Tickets
        </button>
      </div>
      
      <div className="table-responsive">
        <table className="table table-striped table-bordered">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Category</th>
              <th>Description</th>
              <th>Status</th>
              <th>User ID</th>
              <th>Assigned To</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length > 0 ? (
              tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.id}</td>
                  <td>{ticket.category}</td>
                  <td>{ticket.description}</td>
                  <td>
                    <span className={`badge ${
                      ticket.status === 'open' ? 'bg-success' : 'bg-secondary'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td>{ticket.user_id}</td>
                  <td>{ticket.assign_id || 'Unassigned'}</td>
                  <td>
                    {!ticket.assign_id && (
                      <button
                        onClick={() => assignTicket(ticket.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Assign to Me
                      </button>
                    )}
                    {ticket.status === 'open' && (
                      <button
                        onClick={() => {
                          axios.put(`/close_ticket/${ticket.id}`).then(() => {
                            fetchAllTickets();
                          });
                        }}
                        className="btn btn-danger btn-sm ms-1"
                      >
                        Close
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center">No tickets found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboard;
