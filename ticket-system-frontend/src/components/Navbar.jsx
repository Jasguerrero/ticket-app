import { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        <a className="navbar-brand" href="#">Ticket System</a>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarContent" 
          aria-controls="navbarContent" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarContent">
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-center">
            <li className="nav-item">
              <span className="nav-link">Welcome, {user.user_name || user.email}</span>
            </li>
            <li className="nav-item ms-2">
              <span className="badge bg-primary">{user.user_role}</span>
            </li>
            <li className="nav-item ms-3">
              <button 
                onClick={onLogout} 
                className="btn btn-danger btn-sm"
              >
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
