import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles.css';
import { ToastProvider } from './ui.jsx';
import Inicio from './pages/Inicio.jsx';
import Registro from './pages/Registro.jsx';
import Login from './pages/Login.jsx';
import AdminLayout from './pages/AdminLayout.jsx';
import Eventos from './pages/Eventos.jsx';
import Evento from './pages/Evento.jsx';
import Sedes from './pages/Sedes.jsx';
import Usuarios from './pages/Usuarios.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/registro/:codigo" element={<Registro />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Eventos />} />
            <Route path="eventos/:id" element={<Evento />} />
            <Route path="sedes" element={<Sedes />} />
            <Route path="usuarios" element={<Usuarios />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  </StrictMode>,
);
