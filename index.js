var Discord = require('discord.js');
const config = require('./config.js');
var Handlers = require('./handlers.js');
var GitlabHelper = require('./gitlab');
var client = new Discord.Client();

var gitlabHelper = new GitlabHelper();
var msgHandler = new Handlers.MessageHandler(client, gitlabHelper);
let endpointHandler = new Handlers.EndpointHandler(client, 457);

global.pendingPackages = [];

client.on('ready', function () {
    console.log("Logged in as " + client.user.tag + "!");
});

client.on('message', msgHandler.handleCommand);

client.on('messageReactionAdd', Handlers.ReactionHandler.handleReaction);

client.login(config.token);