const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// YOUR EXACT SETUP (qbcore + secure user recommended, but root works for now)
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',           // change later to secure user
    password: '',
    database: 'qbcore',     // ← your database
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0
});

// Cache
let QUESTIONS_CACHE = [];
let cacheTime = 0;

async function loadQuestions() {
    const now = Date.now();
    if (now - cacheTime < 30000) return QUESTIONS_CACHE; // 30s cache

    try {
        const [rows] = await pool.execute(`
            SELECT id, question_text, type, word_min, word_max, required, sort_order, image_url
            FROM police_questions 
            WHERE is_active = 1 
            ORDER BY sort_order ASC, id ASC
        `);
        QUESTIONS_CACHE = rows;
        cacheTime = now;
        console.log(rows);
        return rows;
    } catch (err) {
        console.error("Failed to load police_questions:", err);
        return [];
    }
}

// Test connection + load questions on startup
(async () => {
    try {
        const conn = await pool.getConnection();
        console.log('Connected to qbcore database');
        await loadQuestions();
        conn.release();
    } catch (err) {
        console.error('DB CONNECTION FAILED:', err);
        process.exit(1);
    }
})();

// Public: Get questions
app.get('/api/questions', async (req, res) => {
    try {
        const questions = await loadQuestions();
        console.log('questions:', questions);
        // Make sure every question has image_url (even if null)
        const safeQuestions = questions.map(q => ({
            id: q.id,
            question_text: q.question_text,
            type: q.type || 'textarea',
            word_min: q.word_min || 10,
            word_max: q.word_max || 300,
            required: !!q.required,
            sort_order: q.sort_order || 0,
            image_url: q.image_url || null
        }));

        res.json(safeQuestions);
    } catch (err) {
        console.error('Error in /api/questions:', err);
        res.status(500).json({ error: 'Failed to load questions' });
    }
});

// Submit application
app.post('/api/applications', async (req, res) => {
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        const { email, fullname, dob, origin, self_description, answers } = req.body;

        if (!email || !fullname || !dob || !origin || !self_description || !answers) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const descWords = self_description.trim().split(/\s+/).filter(Boolean).length;
        if (descWords < 10 || descWords > 40) {
            return res.status(400).json({ error: `Self description must be 10–40 words (${descWords} found)` });
        }

        const questions = await loadQuestions();
        const answersObj = {};

        for (const q of questions) {
            const ans = (answers[q.id] || '').toString().trim();
            if (q.required && !ans) {
                return res.status(400).json({ error: `Please answer: "${q.question_text.substring(0,60)}..."` });
            }
            const wordCount = ans.split(/\s+/).filter(Boolean).length;
            if (ans && (wordCount < q.word_min || wordCount > q.word_max)) {
                return res.status(400).json({ error: `Question must be ${q.word_min}–${q.word_max} words` });
            }
            answersObj[q.id] = ans;
        }

        // Check duplicate
        const [dup] = await conn.execute('SELECT id FROM police_applications WHERE email = ?', [email.trim().toLowerCase()]);
        if (dup.length > 0) {
            return res.status(409).json({ error: 'You already submitted an application.' });
        }

        // Insert
        await conn.execute(
            `INSERT INTO police_applications 
            (email, fullname, dob, origin, self_description, answers) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                email.trim().toLowerCase(),
                fullname.trim(),
                dob,
                origin.trim(),
                self_description.trim(),
                JSON.stringify(answersObj)
            ]
        );

        await conn.commit();
        res.status(201).json({ success: true, message: 'Application submitted!' });

    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Submit error:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        if (conn) conn.release();
    }
});

// Optional: Admin view
app.get('/api/applications', async (req, res) => {
    const [rows] = await pool.query('SELECT id, email, fullname, status, created_at FROM police_applications ORDER BY created_at DESC');
    res.json(rows);
});

app.get('/api/applications/:id', async (req, res) => {
    const [rows] = await pool.execute('SELECT * FROM police_applications WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    rows[0].answers = JSON.parse(rows[0].answers);
    res.json(rows[0]);
});

app.listen(PORT, () => {
    console.log(`LSPD Application System RUNNING`);
    console.log(`→ Questions: http://localhost:${PORT}/api/questions`);
    console.log(`→ Submit:    POST http://localhost:${PORT}/api/applications`);
});