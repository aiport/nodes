const express = require('express');
const wss = require('ws');
const http = require('http');
const config = require('./config');
const app = express();
const server = http.createServer(app);
const ws = new wss.Server({ server });
const fs = require('fs');
const Docker = require('dockerode');
const chalk = require('chalk');
const deploy = require('./router/routes/serverDockerFunctions')
const info = require('./router/routes/serverInfoFunctions')
const power = require('./router/routes/serverPowerFunctions')
process.env.dockerSocket = process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock";
const docker = new Docker({ socketPath: process.env.dockerSocket });
let consolelogo;
if(config.runtime == "build"){
    consolelogo= fs.readFileSync('./assets/logo-build.txt', 'utf8');
}else{
    consolelogo= fs.readFileSync('./assets/logo-console.txt', 'utf8');

}

let isAuthenticated = false;
if(config.runtime == "build"){
    console.log(chalk.red(consolelogo));
}else{
    console.log(chalk.blueBright(consolelogo));
}
function splitString(str) {
    const parts = str.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid format. String should be in the format "string1:string2"');
    }
    const string1 = parts[0].trim();
    const string2 = parts[1].trim();
    return { string1, string2 };
}
//check if docker is running or not.
if(!config.runtime == "build"){
    docker.ping().then(() => {
        console.log('Docker is running');
    }).catch((err) => {
        throw new Error('Docker is not running. Please start Docker and try again');
        process.exit(1);
    });
}
app.use('/server', deploy);
app.use('/server', info);
app.use('/server', power);
ws.on('connection', (socket) => {
    console.log('Client connected ');
    socket.on('message', (message) => {
        message = message.toString('utf8');
        //auth:password - cmd
        const [auth, cmd] = message.split('-');
        console.log(auth)
        console.log(cmd.trim())
        console.log(config.secret_key)
        if(auth.trim() === `auth:${config.secret_key}`){
            console.log('Authenticated');
            socket.send('Authenticated');
            if(!cmd) return;
            const { string1, string2 } = splitString(cmd.trim());
            switch(string1){
                case 'start':
                    docker.getContainer(string2).start().then(() => {
                        socket.send(`Container ${string2} started`);
                    }).catch((err) => {
                        socket.send(`Error starting container ${string2}. Reason: ${err.message}`);
                    });
                    break;
                case 'stop':
                    docker.getContainer(string2).stop().then(() => {
                        socket.send(`Container ${string2} stopped`);
                    }).catch((err) => {
                        socket.send(`Error stopping container ${string2}`);
                    });
                    break;
                case 'restart':
                    docker.getContainer(string2).restart().then(() => {
                        socket.send(`Container ${string2} restarted`);
                    }).catch((err) => {
                        socket.send(`Error restarting container ${string2}`);
                    });
                    break;
                case 'kill':
                    docker.getContainer(string2).kill().then(() => {
                        socket.send(`Container ${string2} killed`);
                    }).catch((err) => {
                        socket.send(`Error killing container ${string2}`);
                    });
                    break
                case 'exec':
                    docker.getContainer(string2).exec({ Cmd: [string2] }).then((exec) => {
                        exec.start({ hijack: true, stdin: true }, (err, stream) => {
                            if (err) {
                                socket.send(`Error executing command on container ${string2}`);
                            }
                            stream.on('data', (chunk) => {
                                socket.send(chunk.toString('utf8'));
                            });
                        });
                    }).catch((err) => {
                        socket.send(`Error executing command on container ${string2}`);
                    });
                    break;
                default:
                    console.log('Not a valid action')
            }
        }else{
            socket.send('Not authenticated');
        }
    });
});
const port = config.port | 3000;
    setTimeout(function (){
        server.listen(port, () => {
          console.log(`Server started on http://localhost:${port}`);
        });
      }, 2000);
      
