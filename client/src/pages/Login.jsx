import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { post } from '../api.js';
import { Campo } from '../ui.jsx';
import { CabeceraPublica } from './Registro.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const ir = useNavigate();
  const [q] = useSearchParams();
  const entrar = async (e) => {
    e.preventDefault();
    setCargando(true); setError('');
    try {
      await post('/auth/login', { email, password });
      const volver = q.get('volver');
      ir(volver && volver.startsWith('/admin') ? volver : '/admin', { replace: true });
    } catch (err) { setError(err.message); } finally { setCargando(false); }
  };
  return (
    <>
      <CabeceraPublica />
      <main className="publico-contenido" style={{ maxWidth: 420 }}>
        <form className="tarjeta pila" onSubmit={entrar}>
          <h1>Equipo organizador</h1>
          <Campo etiqueta="Correo electrónico"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus /></Campo>
          <Campo etiqueta="Contraseña"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></Campo>
          {error && <div className="aviso aviso-error">{error}</div>}
          <button className="btn btn-primario btn-bloque" disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </main>
    </>
  );
}
