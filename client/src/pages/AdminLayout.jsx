// Estructura de la administración: menú lateral y sesión.
import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { get, post } from '../api.js';
import { Cargando, Logo } from '../ui.jsx';

const UsuarioCtx = createContext(null);
export const useUsuario = () => useContext(UsuarioCtx);

export default function AdminLayout() {
  const [usuario, setUsuario] = useState(null);
  const [menu, setMenu] = useState(false);
  const ir = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    get('/auth/yo').then(setUsuario).catch(() => ir(`/admin/login?volver=${encodeURIComponent(location.pathname + location.search)}`, { replace: true }));
  }, [ir]);
  useEffect(() => setMenu(false), [loc.pathname]);
  if (!usuario) return <Cargando />;
  const salir = async () => { await post('/auth/logout'); ir('/admin/login'); };
  return (
    <UsuarioCtx.Provider value={usuario}>
      <div className="barra-movil">
        <button type="button" onClick={() => setMenu(true)} aria-label="Abrir menú">☰</button>
        <strong>Familia de Nazaret</strong>
      </div>
      <div className="admin">
        <nav className={`lateral ${menu ? 'abierto' : ''}`} onClick={(e) => e.target === e.currentTarget && setMenu(false)}>
          <div className="marca">
            <Logo tam={22} />
            <div><div className="marca-nombre" style={{ fontSize: '1rem' }}>Familia de Nazaret</div><div className="marca-sub" style={{ fontSize: '.7rem' }}>Eventos y hospedaje</div></div>
          </div>
          <NavLink to="/admin" end>📅 Eventos</NavLink>
          <NavLink to="/admin/sedes">🏠 Sedes y habitaciones</NavLink>
          {usuario.rol === 'admin' && <NavLink to="/admin/usuarios">👥 Usuarios</NavLink>}
          <div className="pie">
            <div><strong>{usuario.nombre}</strong></div>
            <div className="pequeno" style={{ opacity: .8, marginBottom: '.5rem' }}>{usuario.email}</div>
            <button type="button" className="btn btn-chico" onClick={salir}>Cerrar sesión</button>
          </div>
        </nav>
        <main className="principal"><Outlet /></main>
      </div>
    </UsuarioCtx.Provider>
  );
}
