import { useState } from 'react';
import { createTicket } from '../api/userDataService';

function TicketForm({ user, onTicketCreated }) {
  const [newTicket, setNewTicket] = useState({
    category: '',
    sub_category: '',
    description: '',
    priority: 'medium' // Default to medium priority
  });
  const [error, setError] = useState('');

  // Define categories and subcategories mapping
  const categoryOptions = [
    'CRUD',
    'SOPORTE TECNICO',
    'SEGURIDAD',
    'QUEJAS Y SUGERENCIAS',
    'TRAMITES ESCOLARES'
  ];

  // Define subcategories based on selected category
  const subcategoryMapping = {
    'CRUD': ['CREATE', 'UPDATE', 'DELETE'],
    'SOPORTE TECNICO': ['BRIGHTSPACE', 'MY ESPACIO', 'TEAMS', 'ALTISIA'],
    'SEGURIDAD': ['INFRAESTRUCTURA', 'CONDUCTA SOCIAL'],
    'QUEJAS Y SUGERENCIAS': [],
    'TRAMITES ESCOLARES': ['KARDEX', 'TITULO', 'SERVICIO SOCIAL']
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // If category changed, reset the subcategory
    if (name === 'category') {
      setNewTicket({
        ...newTicket,
        category: value,
        sub_category: ''
      });
    } else {
      setNewTicket({
        ...newTicket,
        [name]: value
      });
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      // Create the ticket
      await createTicket({
        ...newTicket,
        // If category is QUEJAS Y SUGERENCIAS, explicitly set sub_category to null
        sub_category: newTicket.category === 'QUEJAS Y SUGERENCIAS' ? null : newTicket.sub_category,
        user_id: user.id,
      });
      
      // Reset form
      setNewTicket({
        category: '',
        sub_category: '',
        description: '',
        priority: 'medium'
      });
      
      // Notify parent component
      onTicketCreated();
    } catch (err) {
      setError('Failed to create ticket');
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg mb-8">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Crear nuevo ticket</h3>
        
        {error && (
          <div className="mt-2 text-sm text-red-600">
            {error}
          </div>
        )}
        
        <div className="mt-5">
          <form onSubmit={handleCreateTicket}>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Categoria
                </label>
                <div className="mt-1">
                  <select
                    id="category"
                    name="category"
                    value={newTicket.category}
                    onChange={handleInputChange}
                    required
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="">Selecciona categoria</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="sub_category" className="block text-sm font-medium text-gray-700">
                  Subcategoria
                </label>
                <div className="mt-1">
                  {newTicket.category === 'QUEJAS Y SUGERENCIAS' ? (
                    <input
                      type="text"
                      name="sub_category"
                      id="sub_category"
                      value=""
                      disabled
                      className="bg-gray-100 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="Not applicable"
                    />
                  ) : (
                    <select
                      id="sub_category"
                      name="sub_category"
                      value={newTicket.sub_category}
                      onChange={handleInputChange}
                      required={newTicket.category !== 'QUEJAS Y SUGERENCIAS'}
                      disabled={!newTicket.category || newTicket.category === 'QUEJAS Y SUGERENCIAS'}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    >
                      <option value="">Selecciona subcategoria</option>
                      {newTicket.category && subcategoryMapping[newTicket.category]?.map((subCategory) => (
                        <option key={subCategory} value={subCategory}>{subCategory}</option>
                      ))}
                    </select>
                  )}
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
                    rows={4}
                    value={newTicket.description}
                    onChange={handleInputChange}
                    required
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-3"
                    placeholder="Porfavor escribe tu problema en detalle..."
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-5">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Crear Ticket
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TicketForm;
