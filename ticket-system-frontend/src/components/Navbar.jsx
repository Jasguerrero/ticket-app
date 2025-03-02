import { useState } from 'react';
import { Link } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="font-bold text-xl text-blue-600">Ticket System</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link 
                to={user.user_role === 'admin' ? '/admin' : '/user'} 
                className="border-blue-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Dashboard
              </Link>
            </div>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="flex items-center space-x-2">
              <div className="text-sm font-medium text-gray-700">
                Welcome, {user.user_name || "Test User"}
              </div>
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                {user.user_role}
              </span>
              <button
                onClick={onLogout}
                className="ml-3 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
          
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      {isOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to={user.user_role === 'admin' ? '/admin' : '/user'}
              className="bg-blue-50 border-blue-500 text-blue-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
            >
              Dashboard
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white font-medium">{user.user_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}</span>
                </div>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">{user.user_name || user.email}</div>
                <div className="text-sm font-medium text-gray-500">{user.user_role}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <button
                onClick={onLogout}
                className="block px-4 py-2 text-base font-medium text-red-600 hover:text-red-800 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;