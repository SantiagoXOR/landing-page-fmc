-- RLS POLICIES SIMPLE FIX - PHORENCIAL CRM
BEGIN;

-- Enable RLS on additional tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Rule" ENABLE ROW LEVEL SECURITY;

-- User table policies (simplified - allow all for now)
CREATE POLICY "Users can manage own records" ON "User"
    FOR ALL USING (true);

-- Event table policies (simplified - allow all for now)
CREATE POLICY "Users can manage events" ON "Event"
    FOR ALL USING (true);

-- Rule table policies
CREATE POLICY "Everyone can view rules" ON "Rule"
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage rules" ON "Rule"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

CREATE POLICY "Admins can update rules" ON "Rule"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

CREATE POLICY "Admins can delete rules" ON "Rule"
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

-- Final confirmation
SELECT 'SIMPLE RLS POLICIES CONFIGURED SUCCESSFULLY' as status;

COMMIT;
