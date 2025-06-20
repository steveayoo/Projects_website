const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF and Word documents are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Middleware to check admin authentication
const requireAuth = (req, res, next) => {
    if (!req.session.isAdmin) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Get all projects
router.get('/', (req, res) => {
    db.all('SELECT * FROM projects ORDER BY created_at DESC', (err, projects) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(projects);
    });
});

// Add new project
router.post('/', requireAuth, upload.single('file'), (req, res) => {
    const { name, description, project_link } = req.body;
    
    if (!name || !description) {
        return res.status(400).json({ error: 'Name and description are required' });
    }

    let filePath = null;
    let fileType = null;

    if (req.file) {
        filePath = '/uploads/' + req.file.filename;
        fileType = path.extname(req.file.originalname).toLowerCase();
    }

    db.run(
        `INSERT INTO projects (name, description, file_path, project_link, file_type) 
         VALUES (?, ?, ?, ?, ?)`,
        [name, description, filePath, project_link || null, fileType],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ 
                success: true, 
                message: 'Project added successfully',
                id: this.lastID 
            });
        }
    );
});

// Update project
router.put('/:id', requireAuth, upload.single('file'), (req, res) => {
    const { id } = req.params;
    const { name, description, project_link } = req.body;

    // First get the existing project
    db.get('SELECT * FROM projects WHERE id = ?', [id], (err, project) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        let filePath = project.file_path;
        let fileType = project.file_type;

        // If new file uploaded, delete old file and update path
        if (req.file) {
            if (project.file_path) {
                const oldFilePath = path.join(__dirname, '../public', project.file_path);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }
            filePath = '/uploads/' + req.file.filename;
            fileType = path.extname(req.file.originalname).toLowerCase();
        }

        db.run(
            `UPDATE projects 
             SET name = ?, description = ?, file_path = ?, project_link = ?, file_type = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, description, filePath, project_link || null, fileType, id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }
                res.json({ success: true, message: 'Project updated successfully' });
            }
        );
    });
});

// Delete project
router.delete('/:id', requireAuth, (req, res) => {
    const { id } = req.params;

    // First get the project to delete associated file
    db.get('SELECT * FROM projects WHERE id = ?', [id], (err, project) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Delete file if exists
        if (project.file_path) {
            const filePath = path.join(__dirname, '../public', project.file_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Delete from database
        db.run('DELETE FROM projects WHERE id = ?', [id], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ success: true, message: 'Project deleted successfully' });
        });
    });
});

module.exports = router;