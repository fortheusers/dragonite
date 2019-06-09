const config = require('./config');
const GithubHelper = require('./github');
const discord = require('discord.js');
const http = require("http");

const commands = {
    'updates': {
        requiredPermissions: ['BAN_MEMBERS'],
        action: async function(msg, command) {
            let toleranceCount = 0;
            github = new GithubHelper();
            config.getRepos.forEach(repo => {
                msg.channel.send(`Checking repo: <${repo}>`);
                http.get(repo + "repo.json", response => {
                    body = "";
                    response.on('data', chunk => {
                        body += chunk;
                    });
                    response.on('end', function(){
                        let giveup = false;
                        packages = JSON.parse(body)["packages"];
                        for (let package of packages) {
                            if(!giveup) {
                                github.githubCheck(package.url, package.version.toLowerCase().replace(/^v/, ''), package.name).then(gCheck =>{
                                    msg.channel.send(`${package.name} may be out of date (ours is ${package.version}, Github's is ${gCheck.version}) <${gCheck.url}>`);
                                    toleranceCount = 0;
                                }, e => {
                                    if (e.status != 200 && !giveup) {
                                        msg.channel.send('Github responded with status `' + e.status + '` while checking <' + e.url + '>');
                                        toleranceCount++;
                                        if (toleranceCount >= config.toleranceMax) {
                                            msg.reply(`Gave up checking repos for updates in get repo ${repo} after ${config.toleranceMax} attempts!`);
                                            giveup = true;
                                        }
                                    }
                                });
                            }
                        }
                    });
                    response.on('error', e => {
                        msg.reply(`Error occured while getting repo json, ${e.name}: ${e.message}`);
                    });
                });
            });
        }
    }
}

module.exports = commands;