import { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

function CreateGroup({ user, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  
  const [file, setFile] = useState(null);
  const [uploadedUsernames, setUploadedUsernames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);
  const [newGroupId, setNewGroupId] = useState(null);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
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
              setError('No se encontró una columna de nombres de usuario en el archivo Excel. Por favor, asegúrese de que el archivo tenga una columna llamada "nombre_usuario".');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      // Prepare the data for the API
      const groupData = {
        ...formData,
        teacher_id: user.id
      };
      
      // Make API call to create the group
      const response = await axios.post('/groups', groupData);
      const newGroup = response.data;
      
      // Reset form
      setFormData({
        name: '',
        description: ''
      });
      
      // Show success message
      setCreateSuccess(true);
      setNewGroupId(newGroup.id);
      
      // If we have usernames from the Excel file, add them to the group
      if (uploadedUsernames.length > 0) {
        try {
          await axios.post(`/groups/${newGroup.id}/members/add`, {
            user_names: uploadedUsernames,
            teacher_id: user.id
          });
          
          // Notify parent component of success
          if (onSuccess) onSuccess();
        } catch (err) {
          console.error('Failed to add members to group:', err);
          setError('Se creó el grupo, pero hubo un problema al añadir algunos miembros.');
        }
      } else {
        // Notify parent component of success
        if (onSuccess) onSuccess();
      }
      
    } catch (err) {
      console.error('Failed to create group:', err);
      setError('No se pudo crear el grupo. Por favor, inténtelo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCreateSuccess(false);
    setNewGroupId(null);
    setFile(null);
    setUploadedUsernames([]);
  };

  // If group creation was successful, show a success message
  if (createSuccess) {
    return (
      <div className="px-4 py-5 sm:p-6">
        <div className="bg-green-50 p-4 rounded-md mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Grupo creado exitosamente</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>El grupo ha sido creado correctamente.</p>
                {uploadedUsernames.length > 0 && (
                  <p className="mt-1">Se añadieron {uploadedUsernames.length} estudiantes al grupo.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-5 flex">
          <button
            onClick={handleReset}
            className="mr-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Crear otro grupo
          </button>
          
          <button
            onClick={onSuccess}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Ver todos los grupos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 sm:p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900">Crear nuevo grupo</h3>
      
      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
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
      
      <form onSubmit={handleSubmit} className="mt-5">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nombre del grupo
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Ej: Matemáticas 101"
              />
            </div>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <div className="mt-1">
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Breve descripción del grupo..."
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Una breve descripción del propósito del grupo.
            </p>
          </div>

          <div className="sm:col-span-6">
            <label htmlFor="studentList" className="block text-sm font-medium text-gray-700">
              Lista de estudiantes (Excel)
            </label>
            <div className="mt-1">
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
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onSuccess}
            className="mr-3 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creando...
              </>
            ) : 'Crear Grupo'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateGroup;
