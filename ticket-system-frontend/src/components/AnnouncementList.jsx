function AnnouncementList({ announcements, loading, onViewAnnouncement }) {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
  
    if (announcements.length === 0) {
      return (
        <div className="bg-white shadow overflow-hidden sm:rounded-md py-12 px-4 text-center">
          <svg className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay anuncios</h3>
          <p className="mt-1 text-sm text-gray-500">
            No tienes anuncios para mostrar en este momento.
          </p>
        </div>
      );
    }
  
    return (
      <div className="space-y-4">
        {announcements.map((announcement) => (
          <div 
            key={announcement.id} 
            className={`bg-white shadow overflow-hidden sm:rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-300 ${announcement.is_pinned ? 'border-l-4 border-blue-500' : ''} ${!announcement.is_read ? 'border-l-4 border-green-500' : ''}`}
            onClick={() => onViewAnnouncement(announcement)}
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
    );
  }
  
  export default AnnouncementList;
  