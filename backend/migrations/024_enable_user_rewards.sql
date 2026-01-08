-- Enable reward viewing for 'user' role
UPDATE role_permissions SET can_view = 1 WHERE role = 'user' AND module = 'rewards';
