var Discord = require('discord.js');
const config = require('./config.js');
var Handlers = require('./handlers.js');
var GitlabHelper = require('./gitlab');
var client = new Discord.Client();

var gitlabHelper = new GitlabHelper();
var msgHandler = new Handlers.MessageHandler(client, gitlabHelper);
var reactHandler = new Handlers.ReactionHandler(client);
let endpointHandler = new Handlers.EndpointHandler(client, 457);

client.on('ready', function () {
    console.log("Logged in as " + client.user.tag + "!");
});

client.on('message', function (msg) {
  if (msgHandler.handleCommand(msg)) return;
});

client.on('messageReactionAdd', function (reaction, user) {
  console.debug("Handling reaction " + reaction.emoji.name + "from user " + user.id);
});

client.login(config.token);