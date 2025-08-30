-- Create a test user
INSERT INTO "user" (id, email, name, admin) 
VALUES ('test-user-id', 'test@example.com', 'Test User', false)
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name;

-- Create a team for the user
INSERT INTO teams (id, name, description, "ownerId", "createdAt", "updatedAt") 
VALUES ('test-team-id', 'Test Team', 'Test team', 'test-user-id', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Create team membership
INSERT INTO teams_memberships ("teamId", "userId", role) 
VALUES ('test-team-id', 'test-user-id', 'owner')
ON CONFLICT ("teamId", "userId") DO NOTHING;
