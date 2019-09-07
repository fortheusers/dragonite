var Discord = require('discord.js');
var cron = require('node-cron');
const config = require('./config.js');
var Handlers = require('./handlers.js');
var GitlabHelper = require('./gitlab');
const SSHRemote = require('./ssh.js');
const splash = require('./splash.js');
const Database = require('./database.js');

var client = new Discord.Client();

splash.showSplash();

global.gitlabHelper = new GitlabHelper();
global.dtb = new Database();
var msgHandler = new Handlers.MessageHandler(client, gitlabHelper);
let endpointHandler = new Handlers.EndpointHandler(client, config.http.port);

// Connect to Discord
client.on('ready', function () {
    global.pendingPackages = [];
    console.log("[Discord] Logged in as " + client.user.tag + "!");
    cron.schedule('1 * * * *', () => {
      
      return;
    });
});

client.on('message', msgHandler.handleCommand);
client.on('messageReactionAdd', Handlers.ReactionHandler.handleReaction);
if (config.discord.token)
    client.login(config.discord.token);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// do a test login over SSH to see if we need to prompt for a key
(async function() {
    if (config.ssh.user && config.ssh.server) {
        const sshRemote = new SSHRemote();
        await sleep(500);
        await sshRemote.init(config.ssh);
    }
})();