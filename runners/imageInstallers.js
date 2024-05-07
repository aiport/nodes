const axios = require('axios');
const Docker = require('dockerode');
const config = require('../config.json');;
const chalk = require('chalk');
const fs = require('fs');
let consolelogo;
if(config.runtime == "build"){
    consolelogo= fs.readFileSync('../assets/logo-build.txt', 'utf8');
}else{
    consolelogo= fs.readFileSync('../assets/logo-console.txt', 'utf8');
}
if(config.runtime == "build"){
    console.log(chalk.bold.red(consolelogo));
}else{
    console.log(chalk.bold.blueBright(consolelogo));
}

process.env.dockerSocket = process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock";
// Initialize Docker connection
const docker = new Docker({ socketPath: process.env.dockerSocket });

docker.ping().then(() => {
    console.log(chalk.bold.green('Docker is running on your machine!'));
    console.log(chalk.blueBright('Checking for images to install...'));
    installer().then(() => {
        console.log(chalk.bold.green('All images installed successfully!'));
    }).catch((err) => {
        console.log(chalk.bold.red(`Error installing images: ${err}`));
    })
}).catch((err) => {
    throw new Error('Docker is not running. Please start Docker and try again');
    process.exit(1);
});

async function installer() {
    try {
        // Fetch image configurations from the remote server
        console.log(chalk.blueBright('Installing images...'))
        const options = {
            method: 'GET',
            url: `${config.panel_url}/api/runner/images`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.panelAuth}`
            }
        }

        const response = await axios(options);
        if(response.status !== 200) throw new Error('error fetching images' + response.statusText);
        const data = response.data;
        data.forEach(async (image) => {
            try {
                console.log(chalk.bold.blueBright(`Pulling image ${image['image']}...`));
                await docker.pull(image['image'], (err, stream) => {
                    if (err) {
                        console.error(chalk.bold.red(`error pulling image ${image['image']}: ${err}`));
                        return;
                    }
                    docker.modem.followProgress(stream, onFinished, onProgress);

                    function onFinished(err, output) {
                        if (err) {
                            console.error(chalk.bold.red(`error pulling image ${image['image']}: ${err}`));
                        } else {
                            console.log(chalk.bold.green(`Image ${image['image']} installed successfully!`));
                        }
                    }

                    function onProgress(event) {
                        let progress = event.progress || "";
                        if(progress == ""){
                        console.log(event.status);
                        }else{
                            
                        console.log(event.status + ": " + progress);
                        }
                    }
                });
            } catch (err) {
                console.log(chalk.bold.red(`error pulling image ${image['image']}: ${err}`));
            }
        });
        // Fetch image configurations from the remote server
    } catch (error) {
        console.log(chalk.bold.red(`error fetching images: ${error}`));
        // Exit if the server connection cannot be established
        process.exit();
    }
}




