-- DATOS INICIALES PARA SISTEMA DE USUARIOS Y ROLES - PHORENCIAL CRM
-- =====================================================
-- Este script pobla los permisos y usuarios iniciales del sistema

BEGIN;

-- 1. INSERTAR PERMISOS BASE
-- =====================================================

-- Permisos para LEADS
INSERT INTO permissions (name, description, resource, action) VALUES
('leads:read', 'Ver leads y su información', 'leads', 'read'),
('leads:write', 'Crear y editar leads', 'leads', 'write'),
('leads:delete', 'Eliminar leads', 'leads', 'delete'),
('leads:derive', 'Derivar leads a agencias', 'leads', 'derive'),
('leads:assign', 'Asignar leads a vendedores', 'leads', 'assign'),
('leads:export', 'Exportar datos de leads', 'leads', 'export')
ON CONFLICT (resource, action) DO NOTHING;

-- Permisos para REPORTES
INSERT INTO permissions (name, description, resource, action) VALUES
('reports:read', 'Ver reportes y métricas', 'reports', 'read'),
('reports:create', 'Crear reportes personalizados', 'reports', 'create'),
('reports:export', 'Exportar reportes', 'reports', 'export'),
('reports:manage', 'Gestionar reportes del sistema', 'reports', 'manage')
ON CONFLICT (resource, action) DO NOTHING;

-- Permisos para USUARIOS
INSERT INTO permissions (name, description, resource, action) VALUES
('users:read', 'Ver usuarios del sistema', 'users', 'read'),
('users:write', 'Crear y editar usuarios', 'users', 'write'),
('users:delete', 'Eliminar usuarios', 'users', 'delete'),
('users:manage', 'Gestión completa de usuarios', 'users', 'manage'),
('users:roles', 'Asignar y modificar roles', 'users', 'roles')
ON CONFLICT (resource, action) DO NOTHING;

-- Permisos para CONFIGURACIÓN
INSERT INTO permissions (name, description, resource, action) VALUES
('settings:read', 'Ver configuración del sistema', 'settings', 'read'),
('settings:write', 'Modificar configuración', 'settings', 'write'),
('settings:manage', 'Gestión completa de configuración', 'settings', 'manage')
ON CONFLICT (resource, action) DO NOTHING;

-- Permisos para DOCUMENTOS
INSERT INTO permissions (name, description, resource, action) VALUES
('documents:read', 'Ver documentos', 'documents', 'read'),
('documents:write', 'Subir y editar documentos', 'documents', 'write'),
('documents:delete', 'Eliminar documentos', 'documents', 'delete'),
('documents:manage', 'Gestión completa de documentos', 'documents', 'manage')
ON CONFLICT (resource, action) DO NOTHING;

-- Permisos para DASHBOARD
INSERT INTO permissions (name, description, resource, action) VALUES
('dashboard:read', 'Ver dashboard principal', 'dashboard', 'read'),
('dashboard:metrics', 'Ver métricas avanzadas', 'dashboard', 'metrics'),
('dashboard:manage', 'Configurar dashboard', 'dashboard', 'manage')
ON CONFLICT (resource, action) DO NOTHING;

-- 2. ASIGNAR PERMISOS A ROLES
-- =====================================================

-- ADMIN: Todos los permisos
INSERT INTO role_permissions (role, permission_id)
SELECT 'ADMIN', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- MANAGER: Permisos de gestión sin administración de usuarios
INSERT INTO role_permissions (role, permission_id)
SELECT 'MANAGER', id FROM permissions 
WHERE name IN (
    'leads:read', 'leads:write', 'leads:delete', 'leads:derive', 'leads:assign', 'leads:export',
    'reports:read', 'reports:create', 'reports:export', 'reports:manage',
    'documents:read', 'documents:write', 'documents:delete', 'documents:manage',
    'dashboard:read', 'dashboard:metrics', 'dashboard:manage',
    'settings:read', 'settings:write',
    'users:read'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ANALISTA: Permisos de análisis y reportes
INSERT INTO role_permissions (role, permission_id)
SELECT 'ANALISTA', id FROM permissions 
WHERE name IN (
    'leads:read', 'leads:write', 'leads:derive', 'leads:export',
    'reports:read', 'reports:create', 'reports:export',
    'documents:read', 'documents:write',
    'dashboard:read', 'dashboard:metrics',
    'settings:read'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- VENDEDOR: Permisos básicos de ventas
INSERT INTO role_permissions (role, permission_id)
SELECT 'VENDEDOR', id FROM permissions 
WHERE name IN (
    'leads:read', 'leads:write',
    'documents:read', 'documents:write',
    'dashboard:read',
    'reports:read'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- VIEWER: Solo lectura
INSERT INTO role_permissions (role, permission_id)
SELECT 'VIEWER', id FROM permissions 
WHERE name IN (
    'leads:read',
    'reports:read',
    'dashboard:read',
    'documents:read'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 3. CREAR USUARIOS INICIALES
-- =====================================================

-- Usuario Admin principal
INSERT INTO users (
    email, 
    nombre, 
    apellido, 
    role, 
    status, 
    password_hash
) VALUES (
    'admin@phorencial.com',
    'Administrador',
    'Sistema',
    'ADMIN',
    'ACTIVE',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' -- password: password
) ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Usuario Manager
INSERT INTO users (
    email, 
    nombre, 
    apellido, 
    role, 
    status, 
    password_hash
) VALUES (
    'manager@phorencial.com',
    'Gerente',
    'Demo',
    'MANAGER',
    'ACTIVE',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' -- password: password
) ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Usuario Analista (Ludmila)
INSERT INTO users (
    email, 
    nombre, 
    apellido, 
    role, 
    status, 
    password_hash
) VALUES (
    'ludmila@phorencial.com',
    'Ludmila',
    'Analista',
    'ANALISTA',
    'ACTIVE',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' -- password: password
) ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Usuario Analista (Facundo)
INSERT INTO users (
    email, 
    nombre, 
    apellido, 
    role, 
    status, 
    password_hash
) VALUES (
    'facundo@phorencial.com',
    'Facundo',
    'Analista',
    'ANALISTA',
    'ACTIVE',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' -- password: password
) ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Usuario Vendedor
INSERT INTO users (
    email, 
    nombre, 
    apellido, 
    role, 
    status, 
    password_hash
) VALUES (
    'vendedor@phorencial.com',
    'Vendedor',
    'Demo',
    'VENDEDOR',
    'ACTIVE',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' -- password: password
) ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Usuario Viewer
INSERT INTO users (
    email, 
    nombre, 
    apellido, 
    role, 
    status, 
    password_hash
) VALUES (
    'viewer@phorencial.com',
    'Viewer',
    'Demo',
    'VIEWER',
    'ACTIVE',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' -- password: password
) ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

-- 4. CONFIGURAR CREATED_BY PARA USUARIOS EXISTENTES
-- =====================================================

-- Obtener ID del admin para asignar como creador
DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM users WHERE email = 'admin@phorencial.com';
    
    -- Actualizar created_by para usuarios que no lo tengan
    UPDATE users 
    SET created_by = admin_id 
    WHERE created_by IS NULL AND email != 'admin@phorencial.com';
END $$;

-- 5. INSERTAR LOG DE AUDITORÍA INICIAL
-- =====================================================

INSERT INTO audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    new_values
) 
SELECT 
    id,
    'user_created',
    'users',
    id::text,
    jsonb_build_object(
        'email', email,
        'nombre', nombre,
        'role', role,
        'status', status
    )
FROM users
WHERE created_at >= NOW() - INTERVAL '1 minute';

COMMIT;

-- 6. VERIFICACIÓN DE DATOS
-- =====================================================

-- Mostrar resumen de permisos por rol
SELECT 
    rp.role,
    COUNT(*) as total_permissions,
    array_agg(p.name ORDER BY p.name) as permissions
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
GROUP BY rp.role
ORDER BY rp.role;

-- Mostrar usuarios creados
SELECT 
    email,
    nombre,
    apellido,
    role,
    status,
    created_at
FROM users
ORDER BY role, nombre;
