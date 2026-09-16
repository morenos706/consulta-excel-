-- Aislamiento multi-tenant en base de datos (defensa en profundidad, ver
-- docs/SECURITY.md §1). La capa de aplicacion siempre filtra por tenant_id,
-- pero esta politica de Row-Level Security garantiza que ninguna consulta
-- -ni siquiera una mal escrita- pueda leer o escribir filas de otro tenant.
--
-- El backend debe ejecutar, al inicio de cada conexion/transaccion:
--   SELECT set_config('app.current_tenant_id', '<tenant-uuid>', true);
-- El rol de aplicacion (no el superusuario "postgres") es el que debe
-- quedar sujeto a estas politicas: FORCE ROW LEVEL SECURITY aplica incluso
-- al dueno de la tabla salvo que sea superusuario o BYPASSRLS.

-- tenantId se modela en Prisma como String (uuid generado en aplicacion),
-- por lo que la columna en Postgres es text: la funcion devuelve text para
-- comparar directamente sin depender de un tipo uuid nativo en columna.
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '');
$$ LANGUAGE sql STABLE;

DO $$
DECLARE
  tenant_scoped_tables text[] := ARRAY[
    'accidents', 'areas', 'audit_logs', 'audits', 'brigadists',
    'certificates', 'contractors', 'copasst_meetings', 'copasst_members',
    'corrective_actions', 'courses', 'digital_signatures', 'documents',
    'drills', 'emergencies', 'emergency_equipment', 'emergency_plans',
    'employees', 'findings', 'hazards', 'incidents', 'inspection_templates',
    'inspections', 'maintenances', 'notifications', 'ppe_assignments',
    'ppe_items', 'processes', 'reports', 'risk_assessments', 'roles',
    'sites', 'training_records', 'users', 'work_permits',
    'workflow_states', 'workflow_transitions'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tenant_scoped_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = current_tenant_id());',
      t
    );
  END LOOP;
END $$;
