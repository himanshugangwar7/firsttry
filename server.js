import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';

app.use(cors());
app.use(express.json());

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, hashedPassword]
    );
    res.status(201).json({ message: 'User created successfully', userId: result.rows[0].id });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ message: 'Username already exists' });
    }
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Todo Routes
app.get('/api/todos', authenticateToken, async (req, res) => {
  try {
    const result = await query('SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Fetch todos error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/todos', authenticateToken, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: 'Todo text is required' });

  try {
    const result = await query(
      'INSERT INTO todos (user_id, text, completed) VALUES ($1, $2, false) RETURNING *',
      [req.user.id, text]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create todo error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/todos/:id', authenticateToken, async (req, res) => {
  const { completed, text } = req.body;
  const { id } = req.params;

  try {
    const result = await query(
      'UPDATE todos SET text = COALESCE($1, text), completed = COALESCE($2, completed) WHERE id = $3 AND user_id = $4 RETURNING *',
      [text, completed, id, req.user.id]
    );
    
    if (result.rowCount === 0) return res.status(404).json({ message: 'Todo not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update todo error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.delete('/api/todos/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Todo not found' });
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Delete todo error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
