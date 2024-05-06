const express = require('express');
process.env.dockerSocket = process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock";
const router = express.Router();
const Docker = require('dockerode');

const docker = new Docker({ socketPath: process.env.dockerSocket });

router.post('/api/server/:id/:process', async (req, res) => {
    const auth = req.headers.authorization;
    if(!auth == `Bearer ${config.secret_key}`) return res.status(401).json({ message: `Unauthorized`})
    const { id, process } = req.params;
    const container = docker.getContainer(id);
    if (!container) return res.status(404).json({ message: 'Container not found' });

    if (process === 'start') {
        container.start().then(() => {
            res.json({ message: 'Container started' });
        }).catch((err) => {
            res.status(500).json({ message: err.message });
        });
    } else if (process === 'stop') {
        container.stop().then(() => {
            res.json({ message: 'Container stopped' });
        }).catch((err) => {
            res.status(500).json({ message: err.message });
        });
    } else if (process === 'restart') {
        container.restart().then(() => {
            res.json({ message: 'Container restarted' });
        }).catch((err) => {
            res.status(500).json({ message: err.message });
        });
    } else {
       if(process === 'kill'){
            container.kill().then(() => {
                res.json({ message: 'Container killed' });
            }).catch((err) => {
                res.status(500).json({ message: err.message });
            });
       } else {
            res.status(400).json({ message: 'Invalid process' });
       }
    }
});

module.exports = router;