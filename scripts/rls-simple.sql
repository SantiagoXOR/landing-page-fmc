-- RLS POLICIES SETUP - PHORENCIAL CRM
BEGIN;

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_zone_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE formosa_zones ENABLE ROW LEVEL SECURITY;

-- user_profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Only admins can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

CREATE POLICY "Only admins can delete profiles" ON user_profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

-- lead_history policies
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

CREATE POLICY "Only admins can delete lead history" ON lead_history
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

-- user_zone_assignments policies
CREATE POLICY "Users can view own zone assignments" ON user_zone_assignments
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

CREATE POLICY "Admins can manage zone assignments" ON user_zone_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

CREATE POLICY "Admins can delete zone assignments" ON user_zone_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

-- lead_assignments policies
CREATE POLICY "Users can view own lead assignments" ON lead_assignments
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

CREATE POLICY "Admins can manage lead assignments" ON lead_assignments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

CREATE POLICY "Admins can delete lead assignments" ON lead_assignments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

-- formosa_zones policies
CREATE POLICY "Everyone can view zones" ON formosa_zones
    FOR SELECT USING (true);

CREATE POLICY "Only admins can modify zones" ON formosa_zones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

-- Lead table policies (conditional)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Lead' AND table_schema = 'public') THEN
        EXECUTE 'ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY';
        
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
    END IF;
END $$;

-- Final confirmation
SELECT 'RLS POLICIES CONFIGURED SUCCESSFULLY' as status;

COMMIT;
