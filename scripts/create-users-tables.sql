-- SQL PARA CREAR TABLAS DEL SISTEMA DE USUARIOS Y ROLES
-- Ejecutar en Supabase SQL Editor

-- 1. TABLA DE USUARIOS
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'vendedor',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA DE PERMISOS
CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE PERMISOS POR ROL
CREATE TABLE IF NOT EXISTS role_permissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    role VARCHAR(50) NOT NULL,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

-- 4. TABLA DE PERMISOS ESPECÍFICOS POR USUARIO
CREATE TABLE IF NOT EXISTS user_permissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, permission_id)
);

-- 5. TABLA DE SESIONES DE USUARIO
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLA DE LOG DE AUDITORÍA
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- 8. POBLAR PERMISOS BÁSICOS
INSERT INTO permissions (name, description, resource, action) VALUES
('leads:read', 'Ver leads', 'leads', 'read'),
('leads:write', 'Crear y editar leads', 'leads', 'write'),
('leads:delete', 'Eliminar leads', 'leads', 'delete'),
('pipeline:read', 'Ver pipeline', 'pipeline', 'read'),
('pipeline:write', 'Modificar pipeline', 'pipeline', 'write'),
('reports:read', 'Ver reportes', 'reports', 'read'),
('reports:write', 'Crear reportes', 'reports', 'write'),
('users:read', 'Ver usuarios', 'users', 'read'),
('users:write', 'Gestionar usuarios', 'users', 'write'),
('admin:full', 'Acceso completo de administrador', 'admin', 'full'),
('dashboard:read', 'Ver dashboard', 'dashboard', 'read'),
('settings:read', 'Ver configuración', 'settings', 'read'),
('settings:write', 'Modificar configuración', 'settings', 'write')
ON CONFLICT (name) DO NOTHING;

-- 9. POBLAR PERMISOS POR ROL
-- Rol: admin (acceso completo)
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Rol: manager (acceso a gestión y reportes)
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions 
WHERE name IN (
    'leads:read', 'leads:write', 'leads:delete',
    'pipeline:read', 'pipeline:write',
    'reports:read', 'reports:write',
    'users:read', 'dashboard:read',
    'settings:read'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Rol: vendedor (acceso básico)
INSERT INTO role_permissions (role, permission_id)
SELECT 'vendedor', id FROM permissions 
WHERE name IN (
    'leads:read', 'leads:write',
    'pipeline:read', 'pipeline:write',
    'dashboard:read'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- 10. CREAR USUARIO ADMINISTRADOR POR DEFECTO
INSERT INTO users (email, name, role, is_active) VALUES
('admin@phorencial.com', 'Administrador', 'admin', true),
('manager@phorencial.com', 'Manager', 'manager', true),
('vendedor@phorencial.com', 'Vendedor', 'vendedor', true)
ON CONFLICT (email) DO NOTHING;

-- 11. FUNCIÓN PARA VERIFICAR PERMISOS
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id TEXT,
    p_permission_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN := FALSE;
    v_user_role TEXT;
BEGIN
    -- Obtener rol del usuario
    SELECT role INTO v_user_role FROM users WHERE id = p_user_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar permiso por rol
    SELECT EXISTS(
        SELECT 1 
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role = v_user_role 
        AND p.name = p_permission_name
    ) INTO v_has_permission;
    
    -- Si no tiene permiso por rol, verificar permisos específicos del usuario
    IF NOT v_has_permission THEN
        SELECT COALESCE(up.granted, FALSE) INTO v_has_permission
        FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = p_user_id 
        AND p.name = p_permission_name;
    END IF;
    
    RETURN COALESCE(v_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql;

-- 12. FUNCIÓN PARA REGISTRAR AUDITORÍA
CREATE OR REPLACE FUNCTION log_audit(
    p_user_id TEXT,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_log (
        user_id, action, resource_type, resource_id, 
        old_values, new_values
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_old_values, p_new_values
    );
END;
$$ LANGUAGE plpgsql;
