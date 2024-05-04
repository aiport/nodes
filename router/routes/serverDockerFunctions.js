const express = require('express');
const Docker = require('dockerode');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const config = require('../config.json');
const os = require('os');
process.env.dockerSocket = process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock";
const docker = new Docker({ socketPath: process.env.dockerSocket });
docker.ping().then(() => {
    console.log(chalk.bold.green('Docker is running on your machine!'));
}).catch((err) => {
    console.log(chalk.bold.red('Docker is not running on your machine!'));
});

router.post('/api/create', async (req, res) => {
    console.log(chalk.bold.green('A new container creation request has been received! \n Checking if request is authorized...'));
    const headers = req.headers;
    if(!headers.authorization) return res.status(401).json({ error: 'Unauthorized' });
    if(headers.authorization !== `Bearer ${config.secret_key}`) return res.status(401).json({ error: 'Unauthorized' });
    //calculate disk space
    const {image, cmd,env,ports,memory,cpu,portbindings,configfilepath,configfilecontent} = req.body;
    try{
        console.log(chalk.bold.green('Request is authorized! \n Creating container...'));
        await docker.pull(image); // docker will pull image if it did not existed in system or was not installed by the installer for some reasons...
        let id = new Date().getTime().toString();
        const path = path.join(__dirname,'../servers/volumes',id);
        fs.mkdirSync(path, { recursive: true });

        if(configfilepath && configfilecontent){
            const filepath = path.join(path,configfilepath);
            fs.writeFileSync(filepath,configfilecontent);
        }
        const options = {
            image,
            ExposedPorts: ports,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: true,
            OpenStdin: true,
            HostConfig: {
                PortBindings: portbindings,
                Binds: [`${path}:/app/serverdata`],
                Memory: memory*1024*1024,
                CpuCount: cpu
            }
        }
            if(env) options.Env = env;
            if(cmd) options.Cmd = cmd;

        const container = await docker.createContainer(options);
        console.log(chalk.bold.green('Container created successfully! \n Starting container...'));
        await container.start();
        console.log(chalk.bold.green('Container started successfully!'));
        res.status(200).json({containerId: container.id, message: 'Container created successfully',id});

        }catch(err){
            console.log(chalk.bold.red(`Error creating container: ${err}`));
            res.status(500).json({error: err.message});
        }
});

router.delete('/api/delete/:id', async (req, res) => {
    const id = req.params.id;
    const headers = req.headers;
    console.log(chalk.bold.green(`A request to delete container ${id} has been received! \n Checking if request is authorized...`));
    if(!headers.authorization) return res.status(401).json({ error: 'Unauthorized' });
    if(headers.authorization !== `Bearer ${config.secret_key}`) return res.status(401).json({ error: 'Unauthorized' });
    try{
        console.log(chalk.bold.green('Request is authorized! \n Deleting container...'));
        console.log(chalk.bold.green(`Deleting container ${id}...`));
        const container = docker.getContainer(id);
        console.log(chalk.bold.green(`Stopping container ${id}...`));
        await container.stop();
        console.log(chalk.bold.green(`Container ${id} stopped successfully!`));
        await container.remove();
        console.log(chalk.bold.green(`Container ${id} deleted successfully!`));
        res.status(200).json({message: `Container ${id} deleted successfully!`});
    }catch(err){
        console.log(chalk.bold.red(`Error deleting container: ${err}`));
        res.status(500).json({error: err.message});
    }
});

module.exports = router;

