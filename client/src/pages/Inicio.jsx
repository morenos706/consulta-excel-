// Página de inicio pública: acceso por código de evento y a la administración.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CabeceraPublica } from './Registro.jsx';

export default function Inicio() {
  const [codigo, setCodigo] = useState('');
  const ir = useNavigate();
  return (
    <>
      <CabeceraPublica />
      <main className="publico-contenido pila">
        <div className="tarjeta pila">
          <h1>Bienvenido</h1>
          <p>Para inscribirse en un evento de la Fundación Familia de Nazaret, abra el enlace que le compartieron o escriba el código del evento.</p>
          <form className="fila" onSubmit={(e) => { e.preventDefault(); if (codigo.trim()) ir(`/registro/${codigo.trim().toUpperCase()}`); }}>
            <input placeholder="Código del evento (ej. B4HV72AM)" value={codigo} onChange={(e) => setCodigo(e.target.value)} style={{ flex: 1, minWidth: 200, textTransform: 'uppercase' }} />
            <button className="btn btn-primario" type="submit">Ir a la inscripción</button>
          </form>
        </div>
        <p className="centro pequeno"><Link to="/admin">Acceso del equipo organizador</Link></p>
      </main>
    </>
  );
}
