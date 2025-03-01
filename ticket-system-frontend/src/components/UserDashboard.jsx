import { useState, useEffect } from 'react';
import axios from 'axios';

function UserDashboard({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTicket, setNewTicket] = useState({
    category: '',
    sub_category: '',
    description: ''
  });

  useEffect(() => {
    fetchUserTickets();
  }, [user.id]);

  const fetchUserTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/tickets_user_open/${user.id}`);
      setTickets(response.data);
    } catch (err) {
      setError('Failed to fetch your tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchClosedTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/tickets_user_closed/${user.id}`);
      setTickets(response.data);
    } catch (err) {
      setError('Failed to fetch closed tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTicket({
      ...newTicket,
      [name]: value
    });
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/tickets', {
        id: Math.floor(Math.random() * 1000000), // Simple random ID for demo
        ...newTicket,
        user_id: user.id,
        status: 'open'
      });
      setNewTicket({
        category: '',
        sub_category: '',
        description: ''
      });
      setShowCreateForm(false);
      fetchUserTickets();
    } catch (err) {
      setError('Failed to create ticket');
    }
  };

  if (loading) {
    return <div>Loading tickets...</div>;
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">User Dashboard</h2>
      
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <button 
          onClick={fetchUserTickets} 
          className="btn btn-primary me-2"
        >
          My Open Tickets
        </button>
        <button 
          onClick={fetchClosedTickets} 
          className="btn btn-secondary me-2"
        >
          My Closed Tickets
        </button>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)} 
          className="btn btn-success float-end"
        >
          {showCreateForm ? 'Cancel' : 'Create Ticket'}
        </button>
      </div>
      
      {showCreateForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Create New Ticket</h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateTicket}>
              <div className="mb-3">
                <label htmlFor="category" className="form-label">Category</label>
                <input
                  id="category"
                  name="category"
                  className="form-control"
                  value={newTicket.category}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="sub_category" className="form-label">Sub Category</label>
                <input
                  id="sub_category"
                  name="sub_category"
                  className="form-control"
                  value={newTicket.sub_category}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea
                  id="description"
                  name="description"
                  className="form-control"
                  value={newTicket.description}
                  onChange={handleInputChange}
                  rows="4"
                  required
                ></textarea>
              </div>
              
              <button
                type="submit"
                className="btn btn-primary"
              >
                Submit Ticket
              </button>
            </form>
          </div>
        </div>
      )}
      
      <div className="table-responsive">
        <table className="table table-striped table-bordered">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Category</th>
              <th>Description</th>
              <th>Status</th>
              <th>Assigned To</th>
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
                  <td>{ticket.assign_id || 'Unassigned'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center">No tickets found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserDashboard;
