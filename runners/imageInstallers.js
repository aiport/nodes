const config = require('../config.json');
const axios = require('axios');
const Docker = require('dockerode');
const chalk = require('chalk');
const fs = require('fs');
const docker = new Docker({ socketPath: process.env.dockerSocket });

if(config.runtime == "build"){
    console.log(chalk.red(consolelogo));
}else{
    console.log(chalk.blueBright(consolelogo));
}
if(config.runnerImg){
    return console.log(chalk.bold.red('Runner image already exists. Skipping installation'));
}
console.log(chalk.bold.blue('Installing runner image...'));
const options = {
    method: 'get',
    url: config.panel_url + '/api/runner/images',
    headers: {
        'Authorization': `Bearer ${config.secret_key}`
    }
};
axios(options).then((response) => {
    const images = response.data;
    //images response:
    /**
     * [{name:'nodejs', image:'quacky.io/skyportd/nodejs'}, {name:'python', image:'quacky.io/skyportd/python'}]
     * pull each one by one
     */
    
}).catch((err) => {
    console.log(chalk.red('Error fetching runner images. Please try again later'));
    process.exit(1);
});