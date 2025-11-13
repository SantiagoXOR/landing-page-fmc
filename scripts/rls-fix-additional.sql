-- RLS POLICIES FOR ADDITIONAL TABLES - PHORENCIAL CRM
BEGIN;

-- Enable RLS on additional tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rule" ENABLE ROW LEVEL SECURITY;

-- User table policies
CREATE POLICY "Users can view own user record" ON "User"
    FOR SELECT USING (auth.uid() = id::uuid);

CREATE POLICY "Users can update own user record" ON "User"
    FOR UPDATE USING (auth.uid() = id::uuid)
    WITH CHECK (auth.uid() = id::uuid);

CREATE POLICY "Only admins can insert users" ON "User"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

CREATE POLICY "Only admins can delete users" ON "User"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

-- Event table policies
CREATE POLICY "Users can view events for assigned leads" ON "Event"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lead_assignments la
            WHERE la.lead_id::text = "Event"."leadId"
            AND la.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

CREATE POLICY "Users can create events for assigned leads" ON "Event"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM lead_assignments la
            WHERE la.lead_id::text = "Event"."leadId"
            AND la.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

CREATE POLICY "Users can update events for assigned leads" ON "Event"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM lead_assignments la
            WHERE la.lead_id::text = "Event"."leadId"
            AND la.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'MANAGER')
        )
    );

CREATE POLICY "Only admins can delete events" ON "Event"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

-- Rule table policies
CREATE POLICY "Everyone can view rules" ON "Rule"
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage rules" ON "Rule"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

-- Final confirmation
SELECT 'ADDITIONAL RLS POLICIES CONFIGURED SUCCESSFULLY' as status;

COMMIT;
