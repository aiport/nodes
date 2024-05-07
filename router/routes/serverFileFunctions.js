const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const multer = require('multer');
const upload = multer({ dest: 'server/' });
const path = require('path');
const config = require('../../config.json');
function isSafePath(base, target) {
    const fullPath = path.resolve(base, target);
    if (!fullPath.startsWith(base)) {
        throw new Error('Attempting to access outside of the volume');
    }
    return fullPath;
}
function isEditable(file) {
    const editableExtensions = ['.txt', '.json', '.js', '.html', '.css', '.md','.py'];
    return editableExtensions.includes(path.extname(file).toLowerCase());
}
router.get('/:id/files', async (req, res) => {
    const auth = req.headers.authorization;
    if(!auth == `Bearer ${config.secret_key}`) return res.status(401).json({ message: `Unauthorized`})
    const id = req.params.id;
    const subPath = req.query.path || '';
    const volumePath = path.join(__dirname, '../../server/',id);

    if (!id) return res.status(400).json({ message: 'No volume ID' });

    try {
        const fullPath = isSafePath(volumePath, subPath);
        const files = await fs.readdir(fullPath, { withFileTypes: true });
        const detailedFiles = files.map(file => ({
            name: file.name,
            isDirectory: file.isDirectory(),
            isEditable: isEditable(file.name)
        }));
        
        res.json({ files: detailedFiles });
    } catch (err) {
        if (err.message.includes('Attempting to access outside of the volume')) {
            res.status(400).json({ message: err.message });
        } else {
            res.status(500).json({ message: err.message });
        }
    }
});
router.get('/:id/files/view/:filename', async (req, res) => {
    const auth = req.headers.authorization;
    if(!auth == `Bearer ${config.secret_key}`) return res.status(401).json({ message: `Unauthorized`})
    const { id, filename } = req.params;
    const volumePath = path.join(__dirname, '../../server/', id);

    if (!id || !filename) return res.status(400).json({ message: 'No volume ID' });
    
    const dirPath = req.query.path;
    
    let formattedPath;
    if (dirPath) {
        formattedPath = dirPath + '/' + filename
    } else {
        formattedPath = filename
    }

    try {
        const filePath = isSafePath(volumePath, formattedPath);
        
        if (!isEditable(filePath)) {
            return res.status(400).json({ message: 'File type not supported for viewing' });
        }
        const content = await fs.readFile(filePath, 'utf8');
        res.json({ content });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/:id/files/upload', upload.array('files'), async (req, res) => {
    const auth = req.headers.authorization;
    if(!auth == `Bearer ${config.secret_key}`) return res.status(401).json({ message: `Unauthorized`})
    const { id } = req.params;
    const volumePath = path.join(__dirname, '../../server/', id);
    const subPath = req.query.path || '';

    try {
        const fullPath = isSafePath(volumePath, subPath);

        await Promise.all(req.files.map(file => {
            const destPath = path.join(fullPath, file.originalname);
            return fs.rename(file.path, destPath);
        }));

        res.json({ message: 'Files uploaded successfully' });
    } catch (err) {
        req.files.forEach(file => fs.unlink(file.path));
        res.status(500).json({ message: err.message });
    }
});

router.post('api/:id/files/edit/:filename', async (req, res) => {
    const auth = req.headers.authorization;
    if(!auth == `Bearer ${config.secret_key}`) return res.status(401).json({ message: `Unauthorized`})
    const { id, filename } = req.params;
    const { content } = req.body;
    const volumePath = path.join(__dirname, '../../server', id);

    const dirPath = req.query.path;
    
    let formattedPath;
    if (dirPath) {
        formattedPath = dirPath + '/' + filename
    } else {
        formattedPath = filename
    }
    
    try {
        const filePath = isSafePath(volumePath, formattedPath);
        if (!isEditable(filePath)) {
            return res.status(400).json({ message: 'File type not supported for editing' });
        }
        await fs.writeFile(filePath, content);
        res.json({ message: 'File updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('api/:id/files/create/:filename', async (req, res) => {
    const auth = req.headers.authorization;
    if(!auth == `Bearer ${config.secret_key}`) return res.status(401).json({ message: `Unauthorized`})
    const { id, filename } = req.params;
    const { content } = req.body;
    const volumePath = path.join(__dirname, '../../server/', id);
    const subPath = req.query.path || ''; // Use query parameter to get the subpath

    try {
        // Ensure the path is safe and resolve it to an absolute path
        const fullPath = isSafePath(path.join(volumePath, subPath), filename);

        // Write the content to the new file
        await fs.writeFile(fullPath, content);
        res.json({ message: 'File created successfully' });
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.status(404).json({ message: 'Specified path not found' });
        } else {
            res.status(500).json({ message: err.message });
        }
    }
});


router.post('api/:id/folders/create/:foldername', async (req, res) => {
    const auth = req.headers.authorization;
    if(!auth == `Bearer ${config.secret_key}`) return res.status(401).json({ message: `Unauthorized`})
    const { id, foldername } = req.params;
    const volumePath = path.join(__dirname, '../../server/', id);
    const subPath = req.query.path || '';

    try {
        const fullPath = isSafePath(volumePath, subPath);
        const targetFolderPath = path.join(fullPath, foldername);
        await fs.mkdir(targetFolderPath, { recursive: true });
        res.json({ message: 'Folder created successfully' });
    } catch (err) {
        if (err.code === 'EEXIST') {
            res.status(400).json({ message: 'Folder already exists' });
        } else {
            res.status(500).json({ message: err.message });
        }
    }
});
router.delete('/api/:id/files/delete', async (req, res) => {
    const auth = req.headers.authorization;
    if(!auth == `Bearer ${config.secret_key}`) return res.status(401).json({ message: `Unauthorized`})
    const { id, filename } = req.params;
    const volumePath = path.join(__dirname, '../../server/', id);
    
    try {
        const filePath = isSafePath(volumePath, filename);
        await fs.unlink(filePath);
        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
