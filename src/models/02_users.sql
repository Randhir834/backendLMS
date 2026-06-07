-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'student',
  avatar_url TEXT,
  date_of_birth DATE,
  school VARCHAR(255),
  grade VARCHAR(50),
  parent_guardian_name VARCHAR(255),
  phone VARCHAR(50),
  location VARCHAR(255),
  qualifications VARCHAR(500),
  specialization VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
