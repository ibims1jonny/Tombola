USE tombola_db;
-- Create database

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
    id CHAR(36) PRIMARY KEY,
    firstname VARCHAR(100) NOT NULL,
    lastname VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_test BOOLEAN DEFAULT FALSE
);

-- Draw log table
CREATE TABLE IF NOT EXISTS draw_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    draw_time DATETIME NOT NULL,
    participant_id CHAR(36) NOT NULL,
    place INT NOT NULL,
    is_test BOOLEAN DEFAULT FALSE,
    admin_user VARCHAR(100),
    FOREIGN KEY (participant_id) REFERENCES participants(id)
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    password_hash TEXT
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    name VARCHAR(50) PRIMARY KEY,
    value TEXT
);

-- Insert default test mode setting
INSERT INTO settings (name, value) VALUES ('test_mode', 'false');