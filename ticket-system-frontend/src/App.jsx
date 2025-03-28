import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

// Components
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import SuperUserDashboard from './components/SuperUserDashboard';
import Navbar from './components/Navbar';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    // Fetch runtime configuration from server
    const fetchConfig = async () => {
      console.log('Fetching config from server...');
      try {
        const response = await fetch('/api/config');
        console.log('Config response:', response);
        const configData = await response.json();
        console.log('Config data received:', configData);
        
        // Set axios default base URL
        axios.defaults.baseURL = configData.apiUrl;
        console.log('Axios base URL set to:', axios.defaults.baseURL);
        
        setConfig(configData);
        
        // Check if user is stored in localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to load configuration:', error);
        // Fallback to default configuration
        axios.defaults.baseURL = 'http://localhost:5001';
        console.log('Using fallback Axios base URL:', axios.defaults.baseURL);
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Determine which dashboard to redirect to based on user role
  const getDashboardPath = () => {
    if (!user) return '/';
    
    switch (user.user_role) {
      case 'admin':
        return '/admin';
      case 'teacher':
        return '/teacher';
      case 'super-user':
        return '/super-user'
      default:
        return '/user';
    }
  };

  return (
    <Router>
      {user && <Navbar user={user} onLogout={handleLogout} />}
      <div className="w-full">
        <Routes>
          <Route 
            path="/" 
            element={
              user ? (
                <Navigate to={getDashboardPath()} />
              ) : (
                <Login onLogin={handleLogin} />
              )
            } 
          />
          <Route 
            path="/admin" 
            element={
              user && user.user_role === 'admin' ? (
                <AdminDashboard user={user} />
              ) : (
                <Navigate to="/" />
              )
            } 
          />
          <Route 
            path="/teacher" 
            element={
              user && user.user_role === 'teacher' ? (
                <TeacherDashboard user={user} />
              ) : (
                <Navigate to="/" />
              )
            } 
          />
          <Route 
            path="/user" 
            element={
              user ? (
                user.user_role === 'teacher' ? (
                  <Navigate to="/teacher" />
                ) : (
                  <UserDashboard user={user} />
                )
              ) : (
                <Navigate to="/" />
              )
            } 
          />
          <Route 
            path="/super-user" 
            element={
              user && user.user_role === 'super-user' ? (
                <SuperUserDashboard user={user} />
              ) : (
                <Navigate to="/" />
              )
            } 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
