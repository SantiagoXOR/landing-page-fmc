-- =====================================================
-- SCRIPT: CONFIGURACIÓN RLS POLICIES - PHORENCIAL CRM
-- =====================================================
-- Este script configura Row Level Security (RLS) para todas las tablas
-- del sistema CRM Phorencial con políticas de seguridad basadas en roles

BEGIN;

-- =====================================================
-- 1. HABILITAR RLS EN TODAS LAS TABLAS
-- =====================================================

-- Habilitar RLS en user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en lead_history
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en user_zone_assignments
ALTER TABLE user_zone_assignments ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en lead_assignments
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en formosa_zones
ALTER TABLE formosa_zones ENABLE ROW LEVEL SECURITY;

RAISE NOTICE 'RLS habilitado en todas las tablas';

-- =====================================================
-- 2. POLÍTICAS PARA user_profiles
-- =====================================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Solo ADMIN puede crear perfiles
CREATE POLICY "Only admins can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

-- Solo ADMIN puede eliminar perfiles
CREATE POLICY "Only admins can delete profiles" ON user_profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

RAISE NOTICE 'user_profiles: 4 politicas creadas';

-- =====================================================
-- 3. POLÍTICAS PARA lead_history
-- =====================================================

-- Usuarios pueden ver historial de leads asignados
CREATE POLICY "Users can view assigned lead history" ON lead_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lead_assignments la
            WHERE la.lead_id = lead_history.lead_id
            AND la.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

-- Usuarios pueden crear historial para leads asignados
CREATE POLICY "Users can insert lead history" ON lead_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM lead_assignments la
            WHERE la.lead_id = lead_history.lead_id
            AND la.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

-- Solo ADMIN puede eliminar historial
CREATE POLICY "Only admins can delete lead history" ON lead_history
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

RAISE NOTICE 'lead_history: 3 politicas creadas';

-- =====================================================
-- 4. POLÍTICAS PARA user_zone_assignments
-- =====================================================

-- Usuarios pueden ver sus asignaciones de zona
CREATE POLICY "Users can view own zone assignments" ON user_zone_assignments
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

-- Solo ADMIN/MANAGER pueden crear asignaciones
CREATE POLICY "Admins can manage zone assignments" ON user_zone_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

-- Solo ADMIN/MANAGER pueden eliminar asignaciones
CREATE POLICY "Admins can delete zone assignments" ON user_zone_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

RAISE NOTICE 'user_zone_assignments: 3 politicas creadas';

-- =====================================================
-- 5. POLÍTICAS PARA lead_assignments
-- =====================================================

-- Usuarios pueden ver sus asignaciones de leads
CREATE POLICY "Users can view own lead assignments" ON lead_assignments
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

-- Solo ADMIN/MANAGER pueden crear asignaciones
CREATE POLICY "Admins can manage lead assignments" ON lead_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

-- Solo ADMIN/MANAGER pueden eliminar asignaciones
CREATE POLICY "Admins can delete lead assignments" ON lead_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

RAISE NOTICE 'lead_assignments: 3 politicas creadas';

-- =====================================================
-- 6. POLÍTICAS PARA formosa_zones
-- =====================================================

-- Todos pueden ver las zonas
CREATE POLICY "Everyone can view zones" ON formosa_zones
    FOR SELECT USING (true);

-- Solo ADMIN puede modificar zonas
CREATE POLICY "Only admins can modify zones" ON formosa_zones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

RAISE NOTICE 'formosa_zones: 2 politicas creadas';

-- =====================================================
-- 7. POLÍTICAS CONDICIONALES PARA Lead (si existe)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Lead' AND table_schema = 'public') THEN
        -- Habilitar RLS en Lead
        EXECUTE 'ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY';
        
        -- Política: Usuarios pueden ver leads asignados
        EXECUTE 'CREATE POLICY "Users can view assigned leads" ON "Lead"
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM lead_assignments la
                    WHERE la.lead_id = "Lead".id::uuid
                    AND la.user_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE id = auth.uid() 
                    AND role IN (''ADMIN'', ''MANAGER'')
                )
            )';

        -- Política: Usuarios pueden modificar leads asignados
        EXECUTE 'CREATE POLICY "Users can update assigned leads" ON "Lead"
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM lead_assignments la
                    WHERE la.lead_id = "Lead".id::uuid
                    AND la.user_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE id = auth.uid() 
                    AND role IN (''ADMIN'', ''MANAGER'')
                )
            )';

        RAISE NOTICE 'Lead: 2 politicas condicionales creadas';
    ELSE
        RAISE NOTICE 'Tabla Lead no encontrada, politicas no creadas';
    END IF;
END $$;

-- =====================================================
-- 8. CONFIRMACIÓN FINAL
-- =====================================================

SELECT 
    'RLS POLICIES CONFIGURADAS EXITOSAMENTE' as resultado,
    'user_profiles: 4 politicas' as tabla1,
    'lead_history: 3 politicas' as tabla2,
    'user_zone_assignments: 3 politicas' as tabla3,
    'lead_assignments: 3 politicas' as tabla4,
    'formosa_zones: 2 politicas' as tabla5,
    'Lead: 2 politicas condicionales' as tabla6,
    'Sistema seguro y listo para usar' as status;

COMMIT;

RAISE NOTICE 'SCRIPT COMPLETADO EXITOSAMENTE';
