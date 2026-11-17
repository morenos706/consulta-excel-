-- Fundación Familia de Nazaret · Eventos y hospedaje
-- Esquema inicial. Se ejecuta igual en PostgreSQL embebido (desarrollo) y en Supabase (producción).

create table if not exists usuarios (
  id            serial primary key,
  email         text not null unique,
  nombre        text not null,
  password_hash text not null,
  rol           text not null default 'coordinador' check (rol in ('admin', 'coordinador')),
  activo        boolean not null default true,
  creado        timestamptz not null default now()
);

-- Casas de convivencia / sedes donde se hospedan los participantes
create table if not exists sedes (
  id          serial primary key,
  nombre      text not null unique,
  direccion   text,
  descripcion text,
  creado      timestamptz not null default now()
);

create table if not exists habitaciones (
  id           serial primary key,
  sede_id      integer not null references sedes(id) on delete cascade,
  codigo       text not null,
  bloque       text not null default '',
  piso         integer not null default 1,
  capacidad    integer not null check (capacidad between 1 and 50),
  tipo         text not null default 'MIXTA'
               check (tipo in ('MATRIMONIAL', 'HOMBRES', 'MUJERES', 'FAMILIAR', 'PRESBITEROS', 'MIXTA')),
  accesible    boolean not null default false,
  bano_privado boolean not null default false,
  activa       boolean not null default true,
  notas        text,
  unique (sede_id, codigo)
);

create table if not exists eventos (
  id           serial primary key,
  codigo       text not null unique,
  nombre       text not null,
  tipo         text not null default 'CONVIVENCIA',
  descripcion  text,
  fecha_inicio date not null,
  fecha_fin    date not null,
  fecha_limite date,
  sede_id      integer references sedes(id) on delete set null,
  cupo         integer,
  activo       boolean not null default true,
  creado       timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);

-- Una persona puede asistir a muchos eventos; sus datos y documentos se reutilizan
create table if not exists personas (
  id               serial primary key,
  documento_tipo   text not null check (documento_tipo in ('CC', 'CE', 'PA', 'TI', 'RC')),
  identificacion   text not null unique,
  nombre           text not null,
  apellido         text not null,
  fecha_nacimiento date not null,
  sexo             text not null check (sexo in ('F', 'M')),
  celular          text not null,
  email            text not null,
  direccion        text not null,
  creado           timestamptz not null default now(),
  actualizado      timestamptz not null default now()
);

create table if not exists documentos (
  id         serial primary key,
  persona_id integer not null references personas(id) on delete cascade,
  titular    text not null default 'PERSONA' check (titular in ('PERSONA', 'ACUDIENTE')),
  lado       text not null check (lado in ('FRENTE', 'REVERSO')),
  mime       text not null,
  datos      bytea not null,
  creado     timestamptz not null default now()
);
create index if not exists documentos_persona_idx on documentos (persona_id, titular, lado, id desc);

create table if not exists inscripciones (
  id                     serial primary key,
  evento_id              integer not null references eventos(id) on delete cascade,
  persona_id             integer not null references personas(id) on delete cascade,
  tipo_persona           text not null
                         check (tipo_persona in ('HOMBRE SOLO', 'MUJER SOLA', 'MATRIMONIO', 'PRESBITERO', 'SEMINARISTA')),
  comunidad              text,
  parroquia              text,
  movilidad_reducida     boolean not null default false,
  necesidades            text,
  acudiente_tipo         text,
  acudiente_identificacion text,
  acudiente_nombre       text,
  acudiente_apellido     text,
  acudiente_email        text,
  acudiente_celular      text,
  conyuge_identificacion text,
  conyuge_inscripcion_id integer references inscripciones(id) on delete set null,
  acepta_politica        boolean not null,
  acepta_cultura         boolean not null,
  estado                 text not null default 'INSCRITO'
                         check (estado in ('INSCRITO', 'CONFIRMADO', 'LLEGO', 'CANCELADO')),
  habitacion_id          integer references habitaciones(id) on delete set null,
  observaciones          text,
  creado                 timestamptz not null default now(),
  unique (evento_id, persona_id)
);
create index if not exists inscripciones_evento_idx on inscripciones (evento_id);
create index if not exists inscripciones_habitacion_idx on inscripciones (habitacion_id);

create table if not exists auditoria (
  id         serial primary key,
  usuario_id integer references usuarios(id) on delete set null,
  accion     text not null,
  detalle    text,
  creado     timestamptz not null default now()
);

-- En Supabase las tablas del esquema public quedan expuestas por la API REST con la clave anónima.
-- Se activa RLS sin políticas: solo el servidor (conexión directa a PostgreSQL) puede leer o escribir.
alter table usuarios      enable row level security;
alter table sedes         enable row level security;
alter table habitaciones  enable row level security;
alter table eventos       enable row level security;
alter table personas      enable row level security;
alter table documentos    enable row level security;
alter table inscripciones enable row level security;
alter table auditoria     enable row level security;
