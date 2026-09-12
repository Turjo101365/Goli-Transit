-- Migration 008: Seed Turjo Admin Account
-- Email: turjo5892@gmail.com
-- Password: Turjo1244

INSERT INTO users (name, email, role, status, password_hash)
VALUES (
  'Turjo',
  'turjo5892@gmail.com',
  'admin',
  'active',
  'bcrypt$$2a$10$GZsj8p2/j4QWg0NkPMmNK.hJZIK503WHZYkEIW4AwV8lM43p1yLU2'
)
ON DUPLICATE KEY UPDATE
  role = 'admin',
  status = 'active',
  password_hash = 'bcrypt$$2a$10$GZsj8p2/j4QWg0NkPMmNK.hJZIK503WHZYkEIW4AwV8lM43p1yLU2';
