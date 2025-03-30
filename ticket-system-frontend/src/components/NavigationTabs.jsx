function NavigationTabs({ activeTab, onTabChange, unreadAnnouncementsCount }) {
    return (
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => onTabChange('create')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Nuevo Ticket
          </button>
          <button
            onClick={() => onTabChange('open')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'open'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tickets Pendientes
          </button>
          <button
            onClick={() => onTabChange('closed')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'closed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tickets Cerrados
          </button>
          <button
            onClick={() => onTabChange('groups')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'groups'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Mis Grupos
          </button>
          <button
            onClick={() => onTabChange('announcements')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'announcements'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Anuncios
            {unreadAnnouncementsCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                {unreadAnnouncementsCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    );
  }
  
  export default NavigationTabs;
  