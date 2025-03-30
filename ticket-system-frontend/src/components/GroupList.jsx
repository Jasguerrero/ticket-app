function GroupList({ groups, loading }) {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
  
    if (groups.length === 0) {
      return (
        <div className="bg-white shadow overflow-hidden sm:rounded-md py-12 px-4 text-center">
          <svg className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No perteneces a ningún grupo</h3>
          <p className="mt-1 text-sm text-gray-500">
            Contacta a tu profesor para ser agregado a un grupo.
          </p>
        </div>
      );
    }
  
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div 
            key={group.id} 
            className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-300"
            onClick={() => window.location.href = `/groups/${group.id}`}
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 truncate">
                {group.name}
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500 line-clamp-3">
                <p>{group.description || 'Sin descripción'}</p>
              </div>
              <div className="mt-3 flex items-center text-sm text-gray-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {group.unread_count > 0 ? `${group.unread_count} anuncios sin leer` : 'No hay anuncios sin leer'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  export default GroupList;
  