function AnnouncementDetail({ announcement, onBack }) {
    return (
      <div>
        <div className="mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Volver a anuncios
          </button>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">{announcement.title}</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {announcement.is_pinned && (
                    <span className="inline-flex items-center mr-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Fijado
                    </span>
                  )}
                  <span className="inline-flex items-center mr-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {announcement.group_name}
                  </span>
                  Publicado el {new Date(announcement.created_at).toLocaleDateString()} a las {new Date(announcement.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-900 whitespace-pre-line">
              {announcement.content}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  export default AnnouncementDetail;
  