var Discord = require('discord.js');
const config = require('./config.js');
var Handlers = require('./handlers.js');
var GitlabHelper = require('./gitlab');
var client = new Discord.Client();
var cron = require('node-cron');

var gitlabHelper = new GitlabHelper();
var msgHandler = new Handlers.MessageHandler(client, gitlabHelper);
let endpointHandler = new Handlers.EndpointHandler(client, 457);

client.on('ready', function () {
    global.pendingPackages = [];
    console.log("Logged in as " + client.user.tag + "!");
    cron.schedule('1 * * * *', () => {
      //TODO: refresh + use sftp to mimic repogen for legacy apps
      return;
    });
});

client.on('message', msgHandler.handleCommand);

client.on('messageReactionAdd', Handlers.ReactionHandler.handleReaction);

client.login(config.token);