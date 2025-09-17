import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import './index.css';

// CONTEXTOS Y COMPONENTES
import { AppProvider, useAppContext } from './contexts/AppContext';
import BudgetDashboard from './BudgetDashboard';
import PersonnelManager from './PersonnelManager';
import MessageModal from './components/MessageModal';


/**
 * Componente AppContent - Versión simplificada y limpia
 * 
 * ¿Qué conseguimos?
 * - Código mínimo en App.jsx
 * - Toda la lógica encapsulada en hooks y componentes
 * - Estructura clara y mantenible
 * - Separación de responsabilidades perfecta
 */
const AppContent = () => {
  const { userId } = useAppContext();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-inter text-gray-800">
      {/* Modal de mensajes - ahora como componente separado */}
      <MessageModal />

      <h1 className="text-4xl font-extrabold text-center text-indigo-800 mb-8 drop-shadow-md">
        📊 Planificador de Recursos y Presupuestos
      </h1>
      
      {userId && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 text-center text-sm text-gray-600 border border-blue-200">
          Tu ID de Usuario (para datos privados): <span className="font-mono text-blue-700 break-all">{userId}</span>
        </div>
      )}

      {/* MENÚ DE NAVEGACIÓN */}
      <nav className="flex justify-center mb-8 gap-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `px-6 py-3 rounded-full text-lg font-semibold transition-colors duration-300 ${
              isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`
          }
        >
          Panel de Presupuestos
        </NavLink>
        <NavLink
          to="/personal"
          className={({ isActive }) =>
            `px-6 py-3 rounded-full text-lg font-semibold transition-colors duration-300 ${
              isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`
          }
        >
          Gestión de Personal
        </NavLink>
      </nav>

      {/* CONTENIDO - Ahora sin props masivas */}
      <Routes>
        <Route path="/" element={<BudgetDashboard />} />
        <Route path="/personal" element={<PersonnelManager />} />
      </Routes>
    </div>
  );
};

// Componente App principal que incluye el Provider
function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;