// Formulario público de inscripción a un evento.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { get, post, comprimirFoto, fecha } from '../api.js';
import { Campo, Cargando, Logo, TIPO_DOC } from '../ui.jsx';

export function CabeceraPublica() {
  return (
    <header className="publico-cabecera">
      <div className="marca">
        <Logo />
        <div>
          <div className="marca-nombre">Fundación Familia de Nazaret</div>
          <div className="marca-sub">Inscripción a eventos</div>
        </div>
      </div>
    </header>
  );
}

const INICIAL = {
  documento_tipo: 'CC', identificacion: '', nombre: '', apellido: '', tipo_persona: '', fecha_nacimiento: '', sexo: '',
  celular: '', email: '', direccion: '', comunidad: '', parroquia: '', necesidades: '',
  acudiente_tipo: 'CC', acudiente_identificacion: '', acudiente_nombre: '', acudiente_apellido: '', acudiente_email: '', acudiente_celular: '',
  conyuge_identificacion: '', conyuge_pendiente: false, acepta_politica: false, acepta_cultura: false,
};

function edadEn(nac, ref) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nac) || !ref) return null;
  const [a, m, d] = nac.split('-').map(Number);
  const [ra, rm, rd] = ref.slice(0, 10).split('-').map(Number);
  let e = ra - a;
  if (rm < m || (rm === m && rd < d)) e -= 1;
  return e;
}

/** Captura de una cara del documento con la cámara del celular o un archivo. */
function FotoDocumento({ titulo, valor, onCambio, error }) {
  const ref = useRef();
  const [procesando, setProcesando] = useState(false);
  const elegir = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setProcesando(true);
    try { onCambio(await comprimirFoto(f)); } catch { onCambio(null); } finally { setProcesando(false); }
  };
  return (
    <div className={`foto-doc ${valor ? 'lista' : ''}`}>
      <div className="etiqueta req">{titulo}</div>
      {valor ? <img src={valor} alt={`Vista previa: ${titulo}`} /> : <p className="ayuda" style={{ margin: '.5rem 0' }}>Encuadre el documento completo, con buena luz y sin reflejos.</p>}
      <input ref={ref} type="file" accept="image/*" capture="environment" hidden onChange={elegir} />
      <button type="button" className={`btn ${valor ? '' : 'btn-oro'}`} onClick={() => ref.current.click()} disabled={procesando}>
        {procesando ? 'Procesando…' : valor ? 'Repetir foto' : '📷 Tomar foto'}
      </button>
      {error && <div className="error-campo" style={{ marginTop: '.4rem' }}>{error}</div>}
    </div>
  );
}

export default function Registro() {
  const { codigo } = useParams();
  const [ev, setEv] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [f, setF] = useState(INICIAL);
  const [fotos, setFotos] = useState({});
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [persona, setPersona] = useState(null);       // { existe, nombre, tieneDocumentos, yaInscrito }
  const [usarDocs, setUsarDocs] = useState(false);
  const [conyuge, setConyuge] = useState(null);
  const [listo, setListo] = useState(null);

  useEffect(() => {
    get(`/publico/eventos/${codigo}`).then(setEv).catch((e) => setErrorCarga(e.message));
  }, [codigo]);

  const cambiar = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((x) => ({ ...x, [k]: v }));
    setErrores((x) => ({ ...x, [k]: undefined }));
  };

  // Ajusta el género según el tipo de persona
  useEffect(() => {
    const s = { 'HOMBRE SOLO': 'M', 'MUJER SOLA': 'F', PRESBITERO: 'M', SEMINARISTA: 'M' }[f.tipo_persona];
    if (s) setF((x) => ({ ...x, sexo: s }));
  }, [f.tipo_persona]);

  const edad = useMemo(() => edadEn(f.fecha_nacimiento, ev?.fecha_inicio), [f.fecha_nacimiento, ev]);
  const menor = edad !== null && edad < 18;
  const matrimonio = f.tipo_persona === 'MATRIMONIO';

  const verificarPersona = async () => {
    const id = f.identificacion.replace(/[\s.]/g, '');
    if (id.length < 4) { setPersona(null); return; }
    try {
      const p = await get(`/publico/eventos/${codigo}/persona/${encodeURIComponent(id)}`);
      setPersona(p);
      setUsarDocs(!!p.tieneDocumentos);
    } catch { setPersona(null); }
  };

  const verificarConyuge = async () => {
    const id = f.conyuge_identificacion.replace(/[\s.]/g, '');
    if (id.length < 4) { setConyuge(null); return; }
    try { setConyuge(await get(`/publico/eventos/${codigo}/conyuge/${encodeURIComponent(id)}`)); } catch { setConyuge(null); }
  };

  const enviar = async (e) => {
    e.preventDefault();
    setMensaje('');
    const faltan = {};
    const reutiliza = usarDocs && persona?.tieneDocumentos;
    if (!reutiliza && (!fotos.documento_frente || !fotos.documento_reverso)) {
      if (!fotos.documento_frente) faltan.documento_frente = 'Tome la foto del frente';
      if (!fotos.documento_reverso) faltan.documento_reverso = 'Tome la foto del reverso';
    }
    const reutilizaAcu = usarDocs && persona?.tieneDocumentosAcudiente;
    if (menor && !reutilizaAcu) {
      if (!fotos.acudiente_documento_frente) faltan.acudiente_documento_frente = 'Tome la foto del frente';
      if (!fotos.acudiente_documento_reverso) faltan.acudiente_documento_reverso = 'Tome la foto del reverso';
    }
    if (Object.keys(faltan).length) {
      setErrores(faltan);
      setMensaje('Faltan las fotos del documento de identidad.');
      return;
    }
    setEnviando(true);
    try {
      const r = await post(`/publico/eventos/${codigo}/inscripcion`, { ...f, ...fotos, usar_documentos_existentes: usarDocs });
      setListo(r);
      window.scrollTo(0, 0);
    } catch (err) {
      setErrores(err.campos || {});
      setMensaje(err.message);
      const primero = err.campos && Object.keys(err.campos)[0];
      if (primero) document.querySelector(`[name="${primero}"]`)?.focus();
    } finally {
      setEnviando(false);
    }
  };

  if (errorCarga) return (<><CabeceraPublica /><main className="publico-contenido"><div className="aviso aviso-error">{errorCarga}</div></main></>);
  if (!ev) return (<><CabeceraPublica /><main className="publico-contenido"><Cargando /></main></>);

  if (listo) {
    return (
      <>
        <CabeceraPublica />
        <main className="publico-contenido">
          <div className="tarjeta pila centro">
            <div style={{ fontSize: '3rem' }}>✅</div>
            <h1>¡Inscripción recibida!</h1>
            <p><strong>{listo.nombre}</strong>, quedó inscrito(a) en <strong>{listo.evento}</strong>.</p>
            {listo.conyuge && <div className="aviso aviso-ok">Su inscripción quedó vinculada con la de su cónyuge, {listo.conyuge}.</div>}
            {listo.conyugePendiente && <div className="aviso aviso-alerta">Su cónyuge aún no está inscrito. Comparta este mismo enlace para que se inscriba e indique la identificación de usted como cónyuge.</div>}
            <p className="suave">La acomodación en habitaciones la organiza el equipo de la Fundación. Le informaremos antes del evento.</p>
            <button type="button" className="btn" onClick={() => { setListo(null); setF(INICIAL); setFotos({}); setPersona(null); setConyuge(null); }}>Inscribir a otra persona</button>
          </div>
        </main>
      </>
    );
  }

  const campo = (k, etiqueta, props = {}, opciones = {}) => (
    <Campo etiqueta={etiqueta} requerido={opciones.req !== false} error={errores[k]} ayuda={opciones.ayuda}>
      <input name={k} value={f[k]} onChange={cambiar(k)} required={opciones.req !== false} {...props} />
    </Campo>
  );

  return (
    <>
      <CabeceraPublica />
      <main className="publico-contenido">
        <div className="tarjeta">
          <span className="insignia oro">{ev.tipo}</span>
          <h1 style={{ marginTop: '.5rem' }}>{ev.nombre}</h1>
          {ev.descripcion && <p style={{ whiteSpace: 'pre-line' }}>{ev.descripcion}</p>}
          <div className="rejilla" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '.5rem 1rem' }}>
            <div><div className="ayuda">Fecha del evento</div><strong>{fecha(ev.fecha_inicio)}{ev.fecha_fin !== ev.fecha_inicio && ` al ${fecha(ev.fecha_fin)}`}</strong></div>
            <div><div className="ayuda">Inscripciones hasta</div><strong>{fecha(ev.fecha_limite)}</strong></div>
            {ev.sede && <div><div className="ayuda">Lugar</div><strong>{ev.sede}</strong>{ev.sede_direccion && <div className="pequeno suave">{ev.sede_direccion}</div>}</div>}
          </div>

          {!ev.abierto ? (
            <div className="aviso aviso-alerta" style={{ marginTop: '1.25rem' }}>{ev.motivo}</div>
          ) : (
            <form onSubmit={enviar} noValidate>
              <section className="seccion-form">
                <h3>Información personal</h3>
                <div className="rejilla">
                  <Campo etiqueta="Tipo de documento" requerido error={errores.documento_tipo}>
                    <select name="documento_tipo" value={f.documento_tipo} onChange={cambiar('documento_tipo')}>
                      {Object.entries(TIPO_DOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </Campo>
                  {campo('identificacion', 'Número de identificación', { inputMode: 'numeric', autoComplete: 'off', onBlur: verificarPersona })}
                  {campo('nombre', 'Nombres', { autoComplete: 'given-name', style: { textTransform: 'uppercase' } })}
                  {campo('apellido', 'Apellidos', { autoComplete: 'family-name', style: { textTransform: 'uppercase' } })}
                  <Campo etiqueta="Tipo" requerido error={errores.tipo_persona}>
                    <select name="tipo_persona" value={f.tipo_persona} onChange={cambiar('tipo_persona')} required>
                      <option value="">Seleccione…</option>
                      <option value="HOMBRE SOLO">Hombre solo</option>
                      <option value="MUJER SOLA">Mujer sola</option>
                      <option value="MATRIMONIO">Matrimonio</option>
                      <option value="PRESBITERO">Presbítero</option>
                      <option value="SEMINARISTA">Seminarista</option>
                    </select>
                  </Campo>
                  <Campo etiqueta="Género" requerido error={errores.sexo}>
                    <select name="sexo" value={f.sexo} onChange={cambiar('sexo')} required>
                      <option value="">Seleccione…</option>
                      <option value="F">Femenino</option>
                      <option value="M">Masculino</option>
                    </select>
                  </Campo>
                  {campo('fecha_nacimiento', 'Fecha de nacimiento', { type: 'date', max: new Date().toISOString().slice(0, 10) }, { ayuda: edad !== null && edad >= 0 ? `${edad} años al iniciar el evento` : undefined })}
                  {campo('celular', 'Celular', { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}
                  {campo('email', 'Correo electrónico', { type: 'email', autoComplete: 'email' })}
                  {campo('direccion', 'Dirección', { autoComplete: 'street-address' })}
                  {campo('comunidad', 'Comunidad', {}, { req: false, ayuda: 'Ej.: 3ª Comunidad Santa Lucía' })}
                  {campo('parroquia', 'Parroquia', {}, { req: false })}
                </div>
                {persona?.yaInscrito && <div className="aviso aviso-alerta" style={{ marginTop: '1rem' }}>Esta identificación ya está inscrita en el evento.</div>}
              </section>

              <section className="seccion-form">
                <h3>Salud</h3>
                <Campo etiqueta="Condiciones de salud, alergias o necesidades especiales" className="" ayuda="Opcional. Ayuda al equipo a atenderle mejor.">
                  <textarea name="necesidades" value={f.necesidades} onChange={cambiar('necesidades')} maxLength={500} />
                </Campo>
              </section>

              <section className="seccion-form">
                <h3>Documento de identidad</h3>
                {persona?.tieneDocumentos ? (
                  <label className="check aviso aviso-info" style={{ marginBottom: '1rem' }}>
                    <input type="checkbox" checked={usarDocs} onChange={(e) => setUsarDocs(e.target.checked)} />
                    <span>Ya tenemos registradas las fotos del documento de esta persona. <strong>Usar las existentes</strong> (desmarque para tomar nuevas).</span>
                  </label>
                ) : <p className="ayuda">Use la cámara para fotografiar el frente y el reverso de su documento.</p>}
                {!(usarDocs && persona?.tieneDocumentos) && (
                  <div className="rejilla-2">
                    <FotoDocumento titulo="Documento: frente" valor={fotos.documento_frente} error={errores.documento_frente} onCambio={(v) => { setFotos((x) => ({ ...x, documento_frente: v })); setErrores((x) => ({ ...x, documento_frente: undefined })); }} />
                    <FotoDocumento titulo="Documento: reverso" valor={fotos.documento_reverso} error={errores.documento_reverso} onCambio={(v) => { setFotos((x) => ({ ...x, documento_reverso: v })); setErrores((x) => ({ ...x, documento_reverso: undefined })); }} />
                  </div>
                )}
              </section>

              {menor && (
                <section className="seccion-form">
                  <h3>Información del acudiente <span className="insignia alerta">Obligatorio · menor de edad</span></h3>
                  <p className="ayuda">Debe completar esta sección porque la persona tiene menos de 18 años.</p>
                  <div className="rejilla">
                    <Campo etiqueta="Tipo de documento del acudiente" requerido error={errores.acudiente_tipo}>
                      <select name="acudiente_tipo" value={f.acudiente_tipo} onChange={cambiar('acudiente_tipo')}>
                        {Object.entries(TIPO_DOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </Campo>
                    {campo('acudiente_identificacion', 'Identificación del acudiente', { inputMode: 'numeric' })}
                    {campo('acudiente_nombre', 'Nombres del acudiente', { style: { textTransform: 'uppercase' } })}
                    {campo('acudiente_apellido', 'Apellidos del acudiente', { style: { textTransform: 'uppercase' } })}
                    {campo('acudiente_email', 'Correo del acudiente', { type: 'email' })}
                    {campo('acudiente_celular', 'Celular del acudiente', { type: 'tel' }, { ayuda: 'Debe ser diferente al celular del menor' })}
                  </div>
                  {!(usarDocs && persona?.tieneDocumentosAcudiente) && (
                    <div className="rejilla-2" style={{ marginTop: '1rem' }}>
                      <FotoDocumento titulo="Documento del acudiente: frente" valor={fotos.acudiente_documento_frente} error={errores.acudiente_documento_frente} onCambio={(v) => setFotos((x) => ({ ...x, acudiente_documento_frente: v }))} />
                      <FotoDocumento titulo="Documento del acudiente: reverso" valor={fotos.acudiente_documento_reverso} error={errores.acudiente_documento_reverso} onCambio={(v) => setFotos((x) => ({ ...x, acudiente_documento_reverso: v }))} />
                    </div>
                  )}
                </section>
              )}

              {matrimonio && (
                <section className="seccion-form">
                  <h3>Información del cónyuge <span className="insignia oro">Matrimonio</span></h3>
                  <p className="ayuda">Indique la identificación de su cónyuge para vincular las dos inscripciones y acomodarlos juntos.</p>
                  <label className="check" style={{ marginBottom: '1rem' }}>
                    <input type="checkbox" checked={f.conyuge_pendiente} onChange={cambiar('conyuge_pendiente')} />
                    <span>Mi cónyuge aún no está registrado(a) <span className="ayuda">— cuando se inscriba e indique mi identificación, las inscripciones quedarán vinculadas.</span></span>
                  </label>
                  {!f.conyuge_pendiente && (
                    <div className="rejilla">
                      {campo('conyuge_identificacion', 'Identificación del cónyuge', { inputMode: 'numeric', onBlur: verificarConyuge })}
                      <div className="campo">
                        <span className="etiqueta">Nombre encontrado</span>
                        <div style={{ padding: '.55rem 0' }}>
                          {!conyuge ? <span className="suave">—</span>
                            : conyuge.encontrado ? <><strong>{conyuge.nombre}</strong> {conyuge.inscritoEnEvento ? <span className="insignia ok">Inscrito en el evento</span> : <span className="insignia alerta">Aún no inscrito en este evento</span>}</>
                              : <span className="suave">No encontramos esa identificación. Puede continuar: se vinculará cuando su cónyuge se inscriba.</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              <section className="seccion-form pila">
                <h3>Aceptación de políticas</h3>
                <label className="check">
                  <input type="checkbox" name="acepta_politica" checked={f.acepta_politica} onChange={cambiar('acepta_politica')} />
                  <span><strong className="req">Acepto la política de tratamiento de datos personales</strong><br /><span className="ayuda">Autorizo a la Fundación Familia de Nazaret a tratar mis datos personales para la organización del evento, conforme a la Ley 1581 de 2012.</span></span>
                </label>
                {errores.acepta_politica && <div className="error-campo">{errores.acepta_politica}</div>}
                <label className="check">
                  <input type="checkbox" name="acepta_cultura" checked={f.acepta_cultura} onChange={cambiar('acepta_cultura')} />
                  <span><strong className="req">Acepto la cultura organizacional</strong><br /><span className="ayuda">Me comprometo a seguir los valores y principios de la Fundación durante el evento.</span></span>
                </label>
                {errores.acepta_cultura && <div className="error-campo">{errores.acepta_cultura}</div>}
              </section>

              {mensaje && <div className="aviso aviso-error" style={{ marginTop: '1rem' }}>{mensaje}</div>}
              <button type="submit" className="btn btn-primario btn-grande btn-bloque" style={{ marginTop: '1.25rem' }} disabled={enviando}>
                {enviando ? 'Enviando…' : 'Inscribir'}
              </button>
              <p className="ayuda centro" style={{ marginTop: '.5rem' }}>Los campos marcados con <span style={{ color: 'var(--error)' }}>*</span> son obligatorios.</p>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
