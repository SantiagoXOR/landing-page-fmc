-- Actualizar roles de usuarios a formato correcto
UPDATE users 
SET 
  role = CASE 
    WHEN LOWER(role) = 'admin' THEN 'ADMIN'
    WHEN LOWER(role) = 'manager' THEN 'MANAGER'
    WHEN LOWER(role) = 'vendedor' THEN 'VENDEDOR'
    WHEN LOWER(role) = 'analista' THEN 'ANALISTA'
    WHEN LOWER(role) = 'viewer' THEN 'VIEWER'
    ELSE 'VIEWER'
  END,
  status = COALESCE(status, 'ACTIVE'),
  nombre = COALESCE(nombre, SPLIT_PART(email, '@', 1))
WHERE role IS NOT NULL;

-- También actualizar la tabla rol si existe
UPDATE users 
SET 
  rol = CASE 
    WHEN LOWER(rol) = 'admin' THEN 'ADMIN'
    WHEN LOWER(rol) = 'manager' THEN 'MANAGER'
    WHEN LOWER(rol) = 'vendedor' THEN 'VENDEDOR'
    WHEN LOWER(rol) = 'analista' THEN 'ANALISTA'
    WHEN LOWER(rol) = 'viewer' THEN 'VIEWER'
    ELSE 'VIEWER'
  END
WHERE rol IS NOT NULL;

-- Verificar los cambios
SELECT id, email, nombre, role, rol, status FROM users;