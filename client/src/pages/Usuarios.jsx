// Usuarios del equipo organizador (solo administradores).
import { useEffect, useState } from 'react';
import { get, post, put } from '../api.js';
import { Campo, Cargando, Modal, useToast } from '../ui.jsx';
import { useUsuario } from './AdminLayout.jsx';

function FormUsuario({ u, onCerrar, onGuardado }) {
  const [f, setF] = useState({ nombre: u?.nombre || '', email: u?.email || '', rol: u?.rol || 'coordinador', password: '', activo: u?.activo ?? true });
  const [error, setError] = useState('');
  const c = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const guardar = async () => {
    try { await (u ? put(`/usuarios/${u.id}`, f) : post('/usuarios', f)); onGuardado(); } catch (e) { setError(e.message); }
  };
  return (
    <Modal titulo={u ? 'Editar usuario' : 'Nuevo usuario'} onCerrar={onCerrar} pie={<><button type="button" className="btn" onClick={onCerrar}>Cancelar</button><button type="button" className="btn btn-primario" onClick={guardar}>Guardar</button></>}>
      <div className="pila">
        <Campo etiqueta="Nombre" requerido><input value={f.nombre} onChange={c('nombre')} /></Campo>
        <Campo etiqueta="Correo" requerido><input type="email" value={f.email} onChange={c('email')} disabled={!!u} /></Campo>
        <Campo etiqueta="Rol" ayuda="Coordinador: gestiona eventos, inscritos y habitaciones. Administrador: además usuarios y eliminaciones.">
          <select value={f.rol} onChange={c('rol')}><option value="coordinador">Coordinador</option><option value="admin">Administrador</option></select>
        </Campo>
        <Campo etiqueta={u ? 'Nueva contraseña (opcional)' : 'Contraseña'} requerido={!u} ayuda="Mínimo 8 caracteres"><input type="password" value={f.password} onChange={c('password')} autoComplete="new-password" /></Campo>
        {u && <label className="check"><input type="checkbox" checked={f.activo} onChange={c('activo')} /><span>Activo</span></label>}
        {error && <div className="aviso aviso-error">{error}</div>}
      </div>
    </Modal>
  );
}

function CambiarClave({ onCerrar }) {
  const [f, setF] = useState({ actual: '', nueva: '' });
  const [error, setError] = useState('');
  const toast = useToast();
  const guardar = async () => {
    try { await post('/auth/clave', f); toast('Contraseña actualizada'); onCerrar(); } catch (e) { setError(e.message); }
  };
  return (
    <Modal titulo="Cambiar mi contraseña" onCerrar={onCerrar} pie={<><button type="button" className="btn" onClick={onCerrar}>Cancelar</button><button type="button" className="btn btn-primario" onClick={guardar}>Guardar</button></>}>
      <div className="pila">
        <Campo etiqueta="Contraseña actual"><input type="password" value={f.actual} onChange={(e) => setF({ ...f, actual: e.target.value })} /></Campo>
        <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 8 caracteres"><input type="password" value={f.nueva} onChange={(e) => setF({ ...f, nueva: e.target.value })} autoComplete="new-password" /></Campo>
        {error && <div className="aviso aviso-error">{error}</div>}
      </div>
    </Modal>
  );
}

export default function Usuarios() {
  const [lista, setLista] = useState(null);
  const [modal, setModal] = useState(null);
  const yo = useUsuario();
  const cargar = () => get('/usuarios').then(setLista);
  useEffect(() => { cargar(); }, []);
  if (!lista) return <Cargando />;
  return (
    <>
      <div className="encabezado-pagina">
        <h1>Usuarios</h1>
        <div className="fila">
          <button type="button" className="btn" onClick={() => setModal({ t: 'clave' })}>Cambiar mi contraseña</button>
          <button type="button" className="btn btn-primario" onClick={() => setModal({ t: 'u' })}>+ Nuevo usuario</button>
        </div>
      </div>
      <div className="tabla-envoltura">
        <table>
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.nombre}</strong>{u.id === yo.id && <span className="insignia azul" style={{ marginLeft: '.4rem' }}>Usted</span>}</td>
                <td>{u.email}</td>
                <td>{u.rol === 'admin' ? 'Administrador' : 'Coordinador'}</td>
                <td>{u.activo ? <span className="insignia ok">Activo</span> : <span className="insignia">Inactivo</span>}</td>
                <td><button type="button" className="btn btn-chico" onClick={() => setModal({ t: 'u', u })}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal?.t === 'u' && <FormUsuario u={modal.u} onCerrar={() => setModal(null)} onGuardado={() => { setModal(null); cargar(); }} />}
      {modal?.t === 'clave' && <CambiarClave onCerrar={() => setModal(null)} />}
    </>
  );
}
