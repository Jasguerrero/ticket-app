import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

function GroupDetail({ groupId, user, onBack }) {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'members', 'announcements'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // For new announcement form
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [announcementData, setAnnouncementData] = useState({
    title: '',
    content: '',
    is_pinned: false
  });

  // For editing announcement
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  
  // For uploading students
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadedUsernames, setUploadedUsernames] = useState([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  useEffect(() => {
    // Fetch group details when component mounts
    fetchGroupDetails();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch basic group info
      const groupResponse = await axios.get(`/groups/${groupId}`);
      setGroup(groupResponse.data);
      
      // Fetch member count
      const memberCountResponse = await axios.get(`/groups/${groupId}/member_count`);
      setGroup(prev => ({
        ...prev,
        member_count: memberCountResponse.data.member_count
      }));
      
    } catch (err) {
      console.error('Failed to fetch group details:', err);
      setError('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError('');
      setActiveTab('members');
      
      const response = await axios.get(`/groups/${groupId}/members`, {
        params: { requester_id: user.id }
      });
      
      setMembers(response.data);
      
    } catch (err) {
      console.error('Failed to fetch group members:', err);
      setError('Failed to load group members');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      setActiveTab('announcements');
      
      const response = await axios.get(`/groups/${groupId}/announcements`, {
        params: { user_id: user.id }
      });
      
      setAnnouncements(response.data);
      
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAnnouncementData({
      ...announcementData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      const data = {
        ...announcementData,
        teacher_id: user.id
      };
      
      await axios.post(`/groups/${groupId}/announcements`, data);
      
      // Reset form and fetch updated announcements
      setAnnouncementData({
        title: '',
        content: '',
        is_pinned: false
      });
      setShowAnnouncementForm(false);
      fetchAnnouncements();
      
    } catch (err) {
      console.error('Failed to create announcement:', err);
      setError('Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAnnouncement = (announcement) => {
    setAnnouncementData({
      title: announcement.title,
      content: announcement.content,
      is_pinned: announcement.is_pinned
    });
    setEditingAnnouncementId(announcement.id);
    setShowAnnouncementForm(true);
  };

  const handleUpdateAnnouncement = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      const data = {
        ...announcementData,
        user_id: user.id
      };
      
      await axios.put(`/groups/${groupId}/announcements/${editingAnnouncementId}`, data);
      
      // Reset form and fetch updated announcements
      setAnnouncementData({
        title: '',
        content: '',
        is_pinned: false
      });
      setShowAnnouncementForm(false);
      setEditingAnnouncementId(null);
      fetchAnnouncements();
      
    } catch (err) {
      console.error('Failed to update announcement:', err);
      setError('Failed to update announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este anuncio?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      await axios.delete(`/groups/${groupId}/announcements/${announcementId}`, {
        params: { user_id: user.id }
      });
      
      // Fetch updated announcements
      fetchAnnouncements();
      
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      setError('Failed to delete announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setUploadFile(selectedFile);
    
    if (selectedFile) {
      // Read the Excel file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get first worksheet
          const worksheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[worksheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // Extract usernames
          if (jsonData.length > 0) {
            // Check if there's a 'username' or 'user_name' column
            const usernameKey = Object.keys(jsonData[0]).find(
              key => key.toLowerCase() === 'username' || 
                    key.toLowerCase() === 'user_name' || 
                    key.toLowerCase() === 'nombre_usuario'
            );
            
            if (usernameKey) {
              const usernames = jsonData.map(row => row[usernameKey]);
              setUploadedUsernames(usernames);
              setError('');
            } else {
              setError('No se encontró una columna de nombres de usuario en el archivo Excel. Por favor, asegúrese de que el archivo tenga una columna llamada "username" o "user_name".');
              setUploadedUsernames([]);
            }
          } else {
            setError('El archivo Excel está vacío.');
            setUploadedUsernames([]);
          }
        } catch (err) {
          console.error('Error parsing Excel file:', err);
          setError('Error al procesar el archivo Excel. Asegúrese de que sea un archivo válido.');
          setUploadedUsernames([]);
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } else {
      setUploadedUsernames([]);
    }
  };

  const handleUploadStudents = async (e) => {
    e.preventDefault();
    
    if (uploadedUsernames.length === 0) {
      setError('No hay nombres de usuario para añadir.');
      return;
    }
    
    try {
      setUploadLoading(true);
      setError('');
      
      const response = await axios.post(`/groups/${groupId}/members/add`, {
        user_names: uploadedUsernames,
        teacher_id: user.id
      });
      
      setUploadResult(response.data);
      setUploadSuccess(true);
      setShowUploadForm(false);
      
      // Refresh member count and list
      fetchGroupDetails();
      fetchMembers();
      
    } catch (err) {
      console.error('Failed to add members to group:', err);
      setError('Error al añadir estudiantes al grupo.');
    } finally {
      setUploadLoading(false);
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadedUsernames([]);
    setShowUploadForm(false);
    setUploadSuccess(false);
    setUploadResult(null);
  };

  const cancelForm = () => {
    setAnnouncementData({
      title: '',
      content: '',
      is_pinned: false
    });
    setShowAnnouncementForm(false);
    setEditingAnnouncementId(null);
  };

  if (loading && !group) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          <svg className="mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Volver a grupos
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Group Header */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">{group?.name}</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{group?.description || 'Sin descripción'}</p>
          <div className="mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
              {group?.member_count || 0} estudiantes
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Detalles
          </button>
          <button
            onClick={fetchMembers}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Miembros {group?.member_count ? `(${group.member_count})` : ''}
          </button>
          <button
            onClick={fetchAnnouncements}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'announcements'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Anuncios
          </button>
        </nav>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Nombre del grupo</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{group?.name}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">ID del grupo</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{group?.id}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Descripción</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{group?.description || 'Sin descripción'}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Fecha de creación</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {group?.created_at ? new Date(group.created_at).toLocaleDateString() : ''}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Número de miembros</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{group?.member_count || 0}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div>
          {/* Add Upload Button */}
          {!showUploadForm && !uploadSuccess && (
            <div className="mb-6">
              <button
                onClick={() => setShowUploadForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                  <path d="M9 13h2v5a1 1 0 11-2 0v-5z" />
                </svg>
                Subir lista de estudiantes
              </button>
            </div>
          )}

          {/* Upload Success Message */}
          {uploadSuccess && uploadResult && (
            <div className="bg-green-50 p-4 rounded-md mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Estudiantes añadidos correctamente</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Se han añadido {uploadResult.added_count} estudiantes al grupo.</p>
                    {uploadResult.not_found.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">No se encontraron los siguientes usuarios:</p>
                        <ul className="mt-1 list-disc list-inside">
                          {uploadResult.not_found.map((name, idx) => (
                            <li key={idx}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {uploadResult.already_members.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium">Usuarios que ya eran miembros:</p>
                        <ul className="mt-1 list-disc list-inside">
                          {uploadResult.already_members.map((name, idx) => (
                            <li key={idx}>{name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={resetUpload}
                  className="text-sm font-medium text-green-800 hover:text-green-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {/* File Upload Form */}
          {showUploadForm && (
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Subir lista de estudiantes
                </h3>
                <div className="mt-4">
                  <form onSubmit={handleUploadStudents}>
                    <div className="sm:col-span-6">
                      <label htmlFor="studentList" className="block text-sm font-medium text-gray-700">
                        Lista de estudiantes (Excel)
                      </label>
                      <div className="mt-2">
                        <input
                          type="file"
                          id="studentList"
                          accept=".xlsx,.xls"
                          onChange={handleFileChange}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-medium
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Sube un archivo Excel con una columna llamada "username" o "user_name" que contenga los nombres de usuario de los estudiantes.
                      </p>
                      
                      {/* Preview of uploaded usernames */}
                      {uploadedUsernames.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700">Usuarios encontrados: {uploadedUsernames.length}</h4>
                          <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                            <ul className="text-sm text-gray-600">
                              {uploadedUsernames.map((username, index) => (
                                <li key={index} className="py-1 border-b border-gray-100 last:border-0">
                                  {username}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={uploadLoading || uploadedUsernames.length === 0}
                        className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${
                          (uploadLoading || uploadedUsernames.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {uploadLoading ? 'Subiendo...' : 'Añadir estudiantes'}
                      </button>
                      <button
                        type="button"
                        onClick={resetUpload}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay miembros todavía</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Sube una lista de estudiantes para añadirlos al grupo.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de unión</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{member.user_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            member.user_role === 'admin' 
                              ? 'bg-purple-100 text-purple-800'
                              : member.user_role === 'teacher'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {member.user_role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div>
          {/* Add Announcement Button */}
          {!showAnnouncementForm && (
            <div className="mb-6">
              <button
                onClick={() => setShowAnnouncementForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                {editingAnnouncementId ? 'Editar Anuncio' : 'Crear Anuncio'}
              </button>
            </div>
          )}

          {/* Announcement Form */}
          {showAnnouncementForm && (
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {editingAnnouncementId ? 'Editar Anuncio' : 'Crear Nuevo Anuncio'}
                </h3>
                <div className="mt-4">
                  <form onSubmit={editingAnnouncementId ? handleUpdateAnnouncement : handleCreateAnnouncement}>
                    <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                      <div className="sm:col-span-6">
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                          Título
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            name="title"
                            id="title"
                            value={announcementData.title}
                            onChange={handleInputChange}
                            required
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="Título del anuncio"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-6">
                        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                          Contenido
                        </label>
                        <div className="mt-1">
                          <textarea
                            id="content"
                            name="content"
                            rows={5}
                            value={announcementData.content}
                            onChange={handleInputChange}
                            required
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="Contenido del anuncio..."
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-6">
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="is_pinned"
                              name="is_pinned"
                              type="checkbox"
                              checked={announcementData.is_pinned}
                              onChange={handleInputChange}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="is_pinned" className="font-medium text-gray-700">Fijar anuncio</label>
                            <p className="text-gray-500">Los anuncios fijados siempre aparecen en la parte superior de la lista.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3"
                      >
                        {loading ? 'Guardando...' : editingAnnouncementId ? 'Actualizar' : 'Publicar'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelForm}
                        className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Cancelar
                      </button>
                    </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Announcements List */}
          {loading && !showAnnouncementForm ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : announcements.length === 0 && !showAnnouncementForm ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md py-12 px-4 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay anuncios</h3>
              <p className="mt-1 text-sm text-gray-500">
                ¡Empieza creando tu primer anuncio para el grupo!
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAnnouncementForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Crear anuncio
                </button>
              </div>
            </div>
          ) : !showAnnouncementForm && (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className={`bg-white shadow overflow-hidden sm:rounded-lg ${announcement.is_pinned ? 'border-l-4 border-blue-500' : ''}`}>
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
                          Publicado el {new Date(announcement.created_at).toLocaleDateString()} a las {new Date(announcement.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditAnnouncement(announcement)}
                          className="text-sm text-blue-600 hover:text-blue-500"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                          className="text-sm text-red-600 hover:text-red-500"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-gray-900 whitespace-pre-line">
                      {announcement.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GroupDetail;
