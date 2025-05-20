const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// SQLite setup
const db = new sqlite3.Database('database.sqlite', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
});

// Create table
db.run(`CREATE TABLE IF NOT EXISTS persons (
    id INTEGER PRIMARY KEY,
    name TEXT,
    birthDate TEXT,
    age INTEGER,
    createdAt TEXT,
    updatedAt TEXT
)`);

// Multer setup for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('csvFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const results = [];
    const parser = parse({
        columns: true,
        skip_empty_lines: true
    });

    fs.readFile(req.file.path, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).send('Error reading file');
        }

        parser.on('readable', function() {
            let record;
            while ((record = parser.read()) !== null) {
                const birthDate = new Date(record.birthDate);
                const age = calculateAge(birthDate);
                
                results.push({
                    id: parseInt(record.ID),
                    name: record.name,
                    birthDate: birthDate.toISOString(),
                    age: age,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        });

        parser.on('error', function(err) {
            console.error('Error parsing CSV:', err);
            res.status(500).send('Error processing CSV file');
        });

        parser.on('end', function() {
            // Clean up the uploaded file
            fs.unlink(req.file.path, (err) => {
                if (err) console.error('Error deleting file:', err);
            });
            res.json(results);
        });

        parser.write(data);
        parser.end();
    });
});

app.post('/save', (req, res) => {
    const data = req.body;
    
    const stmt = db.prepare('INSERT OR REPLACE INTO persons (id, name, birthDate, age, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
    
    data.forEach(person => {
        stmt.run(
            person.id,
            person.name,
            person.birthDate,
            person.age,
            person.createdAt,
            person.updatedAt
        );
    });
    
    stmt.finalize();
    res.json({ success: true });
});

app.get('/data', (req, res) => {
    db.all('SELECT * FROM persons', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

function calculateAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 