require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'tombola-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Database connection
let db;

async function initDb() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'tombola'
    });
    console.log('Connected to database');
    
    // Check if admin exists, if not create default admin
    const [admins] = await db.execute('SELECT * FROM admins LIMIT 1');
    if (admins.length === 0) {
      const passwordHash = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123', 10);
      await db.execute(
        'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
        [process.env.DEFAULT_ADMIN_USERNAME || 'admin', passwordHash]
      );
      console.log('Default admin created');
    }
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.redirect('/login');
};

// Routes
app.get('/', (req, res) => {
  res.redirect('/form');
});

app.get('/form', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'form.html'));
});

app.post('/submit', async (req, res) => {
  try {
    const { firstname, lastname, email } = req.body;
    
    // Validation
    if (!firstname || !lastname || !email) {
      return res.status(400).json({ error: 'Alle Felder müssen ausgefüllt werden' });
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
    }
    
    // Get test mode status
    const [testModeResult] = await db.execute('SELECT value FROM settings WHERE name = "test_mode"');
    const isTestMode = testModeResult.length > 0 ? testModeResult[0].value === 'true' : false;
    
    // Insert participant
    const participantId = uuidv4();
    await db.execute(
      'INSERT INTO participants (id, firstname, lastname, email, is_test) VALUES (?, ?, ?, ?, ?)',
      [participantId, firstname, lastname, email, isTestMode]
    );
    
    res.status(201).json({ success: true, message: 'Teilnahme erfolgreich registriert' });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten' });
  }
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const [admins] = await db.execute('SELECT * FROM admins WHERE username = ?', [username]);
    
    if (admins.length === 0) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }
    
    const admin = admins[0];
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }
    
    req.session.isAuthenticated = true;
    req.session.adminId = admin.id;
    req.session.adminUsername = admin.username;
    
    res.redirect('/admin');
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten' });
  }
});

app.get('/admin', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/participants', isAuthenticated, async (req, res) => {
  try {
    const { search, sort, order, filter } = req.query;
    
    let query = 'SELECT * FROM participants';
    const params = [];
    
    // Filter by test status
    if (filter === 'test') {
      query += ' WHERE is_test = true';
    } else if (filter === 'real') {
      query += ' WHERE is_test = false';
    }
    
    // Search
    if (search) {
      const searchClause = filter ? ' AND' : ' WHERE';
      query += `${searchClause} (firstname LIKE ? OR lastname LIKE ? OR email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    // Sorting
    if (sort && ['firstname', 'lastname', 'email', 'created_at'].includes(sort)) {
      const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
      query += ` ORDER BY ${sort} ${sortOrder}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }
    
    const [participants] = await db.execute(query, params);
    res.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten' });
  }
});

app.get('/api/export-csv', isAuthenticated, async (req, res) => {
  try {
    const { filter, fields } = req.query;
    const selectedFields = fields ? fields.split(',') : ['name', 'email']; // Default to name and email

    let query = 'SELECT id, firstname, lastname, email, created_at, is_test FROM participants';
    const params = [];

    if (filter === 'test') {
      query += ' WHERE is_test = true';
    } else if (filter === 'real') {
      query += ' WHERE is_test = false';
    }

    query += ' ORDER BY created_at DESC';

    const [participants] = await db.execute(query, params);

    // **Änderung: Semikolon statt Komma**
    const delimiter = ';';

    // Generate CSV headers
    const headers = [];
    if (selectedFields.includes('name')) headers.push('Name');
    if (selectedFields.includes('email')) headers.push('Email');
    if (selectedFields.includes('date')) headers.push('Datum');
    if (selectedFields.includes('test')) headers.push('Testdaten');

    const csvHeader = headers.join(delimiter) + '\n';

    // Generate CSV rows
    const csvRows = participants.map(p => {
      const rowValues = [];

      if (selectedFields.includes('name')) {
        const fullName = `${p.firstname} ${p.lastname}`;
        rowValues.push(fullName);
      }

      if (selectedFields.includes('email')) {
        rowValues.push(p.email);
      }

      if (selectedFields.includes('date')) {
        rowValues.push(p.created_at.toISOString().split('T')[0]);
      }

      if (selectedFields.includes('test')) {
        rowValues.push(p.is_test ? 'Ja' : 'Nein');
      }

      return rowValues.join(delimiter);
    }).join('\n');

    const csv = csvHeader + csvRows;

    let filename = 'teilnehmer';
    if (selectedFields.includes('name') && selectedFields.includes('email')) {
      filename = 'email-kontakte';
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten' });
  }
});


app.get('/api/test-mode', isAuthenticated, async (req, res) => {
  try {
    const [result] = await db.execute('SELECT value FROM settings WHERE name = "test_mode"');
    const isTestMode = result.length > 0 ? result[0].value === 'true' : false;
    res.json({ testMode: isTestMode });
  } catch (error) {
    console.error('Error fetching test mode:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten' });
  }
});

app.post('/api/test-mode', isAuthenticated, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    // Update or insert test mode setting
    await db.execute(
      'INSERT INTO settings (name, value) VALUES ("test_mode", ?) ON DUPLICATE KEY UPDATE value = ?',
      [enabled ? 'true' : 'false', enabled ? 'true' : 'false']
    );
    
    res.json({ success: true, testMode: enabled });
  } catch (error) {
    console.error('Error updating test mode:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten' });
  }
});

app.post('/api/reset-test-data', isAuthenticated, async (req, res) => {
  try {
    // Zuerst die Einträge in draw_log löschen, da sie Fremdschlüssel auf participants haben
    await db.execute('DELETE FROM draw_log WHERE is_test = true');
    // Dann die Testeinträge in participants löschen
    await db.execute('DELETE FROM participants WHERE is_test = true');
    
    res.json({ success: true, message: 'Testdaten wurden zurückgesetzt' });
  } catch (error) {
    console.error('Error resetting test data:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten' });
  }
});

app.post('/api/draw', isAuthenticated, async (req, res) => {
  try {
    // Get test mode status
    const [testModeResult] = await db.execute('SELECT value FROM settings WHERE name = "test_mode"');
    const isTestMode = testModeResult.length > 0 ? testModeResult[0].value === 'true' : false;
    
    // Get all eligible participants
    const [participants] = await db.execute(
      'SELECT id FROM participants WHERE is_test = ?',
      [isTestMode]
    );
    
    if (participants.length < 3) {
      return res.status(400).json({ 
        error: `Nicht genügend Teilnehmer für eine Ziehung. Mindestens 3 ${isTestMode ? 'Test-' : ''}Teilnehmer erforderlich.` 
      });
    }
    
    // Randomly select 3 winners
    const winners = [];
    const participantIds = participants.map(p => p.id);
    
    for (let place = 1; place <= 3; place++) {
      if (participantIds.length === 0) break;
      
      const randomIndex = crypto.randomInt(0, participantIds.length);
      const winnerId = participantIds[randomIndex];
      
      winners.push({ id: winnerId, place });
      
      // Remove winner from pool
      participantIds.splice(randomIndex, 1);
      
      // Log the draw
      await db.execute(
        'INSERT INTO draw_log (draw_time, participant_id, place, is_test, admin_user) VALUES (NOW(), ?, ?, ?, ?)',
        [winnerId, place, isTestMode, req.session.adminUsername]
      );
    }
    
    // Get winner details
    const winnerDetails = [];
    for (const winner of winners) {
      const [details] = await db.execute(
        'SELECT id, firstname, lastname, email FROM participants WHERE id = ?',
        [winner.id]
      );
      
      if (details.length > 0) {
        winnerDetails.push({
          ...details[0],
          place: winner.place
        });
      }
    }
    
    res.json({ 
      success: true, 
      winners: winnerDetails,
      isTestDraw: isTestMode
    });
  } catch (error) {
    console.error('Error drawing winners:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten' });
  }
});

app.get('/api/draw-logs', isAuthenticated, async (req, res) => {
  try {
    const query = `
      SELECT dl.id, dl.draw_time, dl.participant_id, dl.place, dl.is_test, dl.admin_user,
             p.firstname, p.lastname, p.email
      FROM draw_log dl
      JOIN participants p ON dl.participant_id = p.id
      ORDER BY dl.draw_time DESC, dl.place ASC
    `;
    
    const [logs] = await db.execute(query);
    
    // Group logs by draw time
    const drawLogs = {};
    
    logs.forEach(log => {
      const drawTime = log.draw_time.toISOString();
      
      if (!drawLogs[drawTime]) {
        drawLogs[drawTime] = {
          time: log.draw_time,
          isTest: log.is_test,
          admin: log.admin_user,
          winners: []
        };
      }
      
      drawLogs[drawTime].winners.push({
        place: log.place,
        id: log.participant_id,
        firstname: log.firstname,
        lastname: log.lastname,
        email: log.email
      });
    });
    
    res.json(Object.values(drawLogs));
  } catch (error) {
    console.error('Error fetching draw logs:', error);
    res.status(500).json({ error: 'Ein Fehler ist aufgetreten' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Start server
async function startServer() {
  await initDb();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});