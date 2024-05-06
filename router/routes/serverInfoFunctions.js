const express = require('express');
const router = express.Router();
const Docker = require('dockerode');
process.env.dockerSocket = process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock";
const docker = new Docker({socketPath: process.env.dockerSocket});

router.get('api/all', async (req, res) => {
    const auth = req.headers.authorization;
    if(!auth == `Bearer ${config.secret_key}`) return res.status(401).json({ message: `Unauthorized`})
    docker.listContainers({all: true}, (err, containers) => {
        if(err) return res.status(500).json({error: err});
        res.json(containers);
    });
});

router.get('api/server/:id', async (req, res) => {
    const auth = req.headers.authorization;
    if(!auth == `Bearer ${config.secret_key}`) return res.status(401).json({ message: `Unauthorized`})
    const id = req.params.id;
    docker.getContainer(id).inspect((err, container) => {
        if(err) return res.status(500).json({error: err});
        res.json(container);
    });
});

router.get('api/server/:id/ports', async (req, res) => {
    const auth = req.headers.authorization;
    if(!auth == `Bearer ${config.secret_key}`) return res.status(401).json({ message: `Unauthorized`})
    const id = req.params.id;
    docker.getContainer(id).inspect((err, container) => {
        if(err) return res.status(500).json({error: err});
        res.json(container.NetworkSettings.Ports);
    });
});

module.exports = router;