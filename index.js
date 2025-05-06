var Discord = require('discord.js');
var cron = require('node-cron');
const config = require('./config.js');
var Handlers = require('./handlers.js');
var GitlabHelper = require('./gitlab');
const SSHRemote = require('./ssh.js');
const splash = require('./splash.js');
const Database = require('./database.js');

// var client = new Discord.Client();

const client = new Discord.Client({
  intents: [
    // Discord.GatewayIntentBits.DirectMessages,
    // Discord.GatewayIntentBits.Guilds,
    // Discord.GatewayIntentBits.GuildBans,
    // Discord.GatewayIntentBits.GuildMessages,
    "MessageContent",
  ],
});

splash.showSplash();

global.gitlabHelper = new GitlabHelper();
global.dtb = new Database();
var msgHandler = new Handlers.MessageHandler(client, gitlabHelper);
let endpointHandler;
try {
    endpointHandler = new Handlers.EndpointHandler(client, config.http.port);
}catch (e) {}

let retry = 0;

// Connect to Discord
client.on('ready', function () {
    retry = 0;
    global.pendingPackages = [];
    console.log("[Discord] Logged in as " + client.user.tag + "!");

    const verifChannel = client
        .guilds.get(config.discord.packageVerification.guild)
        .channels.get(config.discord.packageVerification.channel);
    const submissions = dtb.getAllPendingPackages();
    for (const submission of submissions) {
        console.log(`[Discord] Caching message ${submission.discord_id} for pending submission ${submission.uuid}`);
        verifChannel.fetchMessage(submission.discord_id);
    }

    cron.schedule('1 * * * *', () => {

      return;
    });
});
client.on('error', function (err) {
    console.error(`Discord Error '${err.name}': '${err.message}'`)
    if (err instanceof Discord.HTTPError) {
        if (retry >= config.discord.maxHTTPErrorRetries) {
            console.error("Previous error exceeded maximum retries! Quitting with error status.");
            process.exit(1);
        }else {
            // wait a while before we actually do anything
            setTimeout(function() {
                client.login(config.discord.token);
                retry++;
            }, config.discord.errorRetriesWait);
        }
    }
})

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
