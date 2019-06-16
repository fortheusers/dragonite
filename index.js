var Discord = require('discord.js');
var cron = require('node-cron');
const config = require('./config.js');
var Handlers = require('./handlers.js');
var GitlabHelper = require('./gitlab');
const SSHRemote = require('./ssh.js');

var client = new Discord.Client();

var gitlabHelper = new GitlabHelper();
var msgHandler = new Handlers.MessageHandler(client, gitlabHelper);
let endpointHandler = new Handlers.EndpointHandler(client, 457);

// let ssh = new SSHRemote();
// (async function() {
//   console.log(await ssh.init(config.ssh));
//   console.log(await ssh.ls());
// })();

client.on('ready', function () {
    global.pendingPackages = [];
    console.log("Logged in as " + client.user.tag + "!");
    cron.schedule('1 * * * *', () => {
      
      return;
    });
});

client.on('message', msgHandler.handleCommand);

client.on('messageReactionAdd', Handlers.ReactionHandler.handleReaction);

client.login(config.token);