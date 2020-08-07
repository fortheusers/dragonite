var config = require("./config.js");
const commands = require('./commands');
const express = require('express');
const cors = require('cors');
const {discord, RichEmbed} = require('discord.js');
const fs = require('fs');
const geoip  = require('geoip-lite');
var AdmZip = require('adm-zip');
const GithubHelper = require('./github');
const Submission = require('./submission');

const convertb64AndSetEmbed = (embed, data, val, files) => {
    let base64Image = data.split(';base64,').pop();
    const name = `tmp_embed_${val}.png`;
    const path = `/tmp/${name}`;
    const attachPath = `attachment://${name}`;
    fs.writeFileSync(path, base64Image, {encoding: 'base64'});
    files.push({"attachment": path, name})

    if (val)
        embed.setThumbnail(attachPath);
    else
        embed.setImage(attachPath);
};

const MessageHandler = class MessageHandler{
    handleCommand(msg) {
        if (msg.content.startsWith(config.discord.commandPrefix)) {
            console.log("Handling command " + msg.content);
            const cmd = msg.content.substring(1).split(' ');
            switch (cmd) {
                case "testcommit":
                    this.gitlab.testCommit();
                    break;
            }
            if (commands[cmd[0]] != null) {
                let hasPerm = true;
                commands[cmd[0]].requiredPermissions.forEach(perm => {
                    if (!msg.member.permissions.has(perm)) {
                        hasPerm = false;
                    }
                });
                if (hasPerm) {
                    commands[cmd[0]].action(msg, cmd);
                }else {
                    msg.reply('You don\'t have permission to run this command.');
                }
            }
        }
    }

    constructor(client, gitlab) {
        this.client = client;
        this.gitlab = gitlab;
    }

}

const EndpointHandler = class EndpointHandler{
    constructor(client, port, gitlab) {
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json({limit: '15mb'}));

        this.port = port;
        this.app.use('/img/hey.gif', express.static('hey.gif'));
        this.app.get('/', (req, res) => {
          res.writeHead(302, {'Location': '/img/hey.gif'});
          res.end();
        });
        this.app.use(express.json());

        this.app.put('/mmcourse/:uuid/:package', (req, res) => {
            if(!/^\d+$/.test(req.params.uuid)) { // Checks if uuid contains non-number
                res.statusCode = 400;
                return res.end();
            }
            dtb.updateMeta(req.connection.remoteAddress, req.params.uuid);

            if (!fs.existsSync('./uploads/')){
                fs.mkdirSync('./uploads/');
            }
            if (!fs.existsSync(`./uploads/${req.params.uuid}/`))
            {
                fs.mkdirSync(`./uploads/${req.params.uuid}/`);
            }

            const fileName = `./uploads/${req.params.uuid}/${encodeURIComponent(req.params.package)}.zip`;
            var stream = fs.createWriteStream(fileName)
            var pipe = req.pipe(stream);
            stream.on('close', () => {
                var zip = new AdmZip(fileName);
                var zipEntries = zip.getEntries();
                res.statusCode = 200;
                if (zipEntries.length != 3)
                {
                    res.statusCode = 400;
                }else
                {
                    zipEntries.forEach(element => {
                        if (!element.name in ['course.bin', 'thumb.bin', 'replay.bin'])
                        {
                            res.statusCode = 400;
                        }
                    });
                    if (res.statusCode == 400)
                    {
                        fs.unlinkSync(fileName);
                    }else{
                        // TODO: Create/Update package somehow
                    }
                }
                return res.end();
            });
        });

        this.app.get('/mmauth/:uuid/:user', (req, res) => {
            dtb.updateMeta(req.connection.remoteAddress, req.params.uuid, req.params.user);
            const dbEntry = dtb.getPermittedPackages(req.params.uuid);
            res.status(200);
            res.send(JSON.stringify(dbEntry));
            res.end();
        });

        this.app.post('/package', (req, res) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

            const ip = req.headers['x-real-ip'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
            const geoness = geoip.lookup(ip);

            let submission = new Submission(req.body);
            submission.pkg.package = submission.pkg.package.replace(/[^a-z0-9]/gi, '');
            let reqFormat = submission.pkg;
            try {
                let embed = new RichEmbed({
                    title: 'Package submission received',
                    color: 0x2170BF,
                    fields: [
                        {
                            name: 'Package',
                            value: reqFormat.package, // TODO: check no collisions
                            inline: true
                        }
                    ]
                });
                if (reqFormat.info.title) embed.addField('Title', reqFormat.info.title, true);
                if (reqFormat.info.author) embed.addField('Author', reqFormat.info.author, true);
                if (reqFormat.info.version) embed.addField('Version', reqFormat.info.version, true);
                if (reqFormat.info.url) embed.addField('URL', reqFormat.info.url, true);

                if (reqFormat.info.description) embed.addField('Description', reqFormat.info.description);

                if (reqFormat.info.category) embed.addField('Category', reqFormat.info.category, true);
                if (reqFormat.info.license) embed.addField('License', reqFormat.info.license, true);
                if (reqFormat.console) embed.addField('Console', reqFormat.console, true);
                if (reqFormat.submitter) embed.addField('Contact', reqFormat.submitter, true);
                if (ip) embed.addField('IP', ip, true);
                if (geoness && geoness.timezone) embed.addField('Location', geoness.timezone, true);

                if (reqFormat.info.details) embed.addField('Details', reqFormat.info.details.replace(/\\n/g, '\n'));
                const files = [];
                if (reqFormat.assets && reqFormat.assets.length > 0) {
                    let txt = '';
                    for (let asset of reqFormat.assets) {
                        if (asset.type) {
                            switch (asset.type) {
                                case 'icon':
                                    if (asset.format && asset.format == 'url') embed.setThumbnail(asset.data);
                                    if (asset.format && asset.format == 'base64') convertb64AndSetEmbed(embed, asset.data, true, files);
                                    break;
                                case 'screen':
                                case 'screenshot':
                                    if (asset.format && asset.format == 'url') embed.setImage(asset.data);
                                    if (asset.format && asset.format == 'base64') convertb64AndSetEmbed(embed, asset.data, false, files);
                                    break;
                                case 'update':
                                case 'extract':
                                case 'local':
                                case 'get':
                                    if (asset.format && asset.format == 'url') txt += `${asset.type}: ${asset.data}\n`;
                                    break;
                                case 'zip':
                                    if (asset.url) txt += `${asset.type}: ${asset.url}\n`;
                                    break;
                            }
                        }
                    }
                    embed.addField('Assets', txt || "Fetch SD-ready zip from latest Github release");
                }
                client.guilds.get(config.discord.packageVerification.guild).channels.get(config.discord.packageVerification.channel).send({embed, files}).then(msg => {
                    //pendingPackages.push({id: msg.id, content: reqFormat});
                    submission.setDiscord(msg.id);
                    dtb.pushPendingPackage(submission);
                    msg.react('✅');
                    msg.react('❎');
                });
                console.log("submission received");
                res.status(200).end();
            } catch (e) {
                console.log("error with submission");
                console.log(`${e.name} - ${e.message}`);
                res.status(400).send({error: e.name, message: e.message}).end();
                return;
            }
        });
        this.app.listen(this.port, () => console.log(`✅ [Submissions] Endpoint HTTP handler listening on port ${this.port}!`));
    }
}

async function sleep(ms)
{
    return new Promise(resolve => setTimeout(resolve, ms));
}

const ReactionHandler = class ReactionHandler {
    static async handleReaction(reaction, user) {
        const id = reaction.message.id;
        if (reaction.users.size == 2) {
            const submission = dtb.getPendingPackageByDiscordID(id);
            if (submission !== undefined) {
                console.log(reaction);

                if (reaction.emoji.name == '✅') {
                    let frontendUrl = config.discord.frontendUrl;
                    if (frontendUrl === undefined) {
                        frontendUrl = "https://apps.fortheusers.org/app/%package%";
                    }

                    let embed = new RichEmbed({
                      title: submission.pkg.package,
                      color: 0xc99203,
                      footer: {text: 'Processing approved submission...'},
                      url: frontendUrl.replace('%package%', submission.pkg.package)
                    })
                    if (reaction.message.embeds.length > 0 &&
                        reaction.message.embeds[0].thumbnail) {
                        embed.setThumbnail(reaction.message.embeds[0].thumbnail.url);
                    }

                    try {
                        await submission.getGitHubRelease();
                    } catch(e) {
                        reaction.message.channel.send(e.toString());
                    }

                    try {
                      const resp = (await global.gitlabHelper.commitPackage(submission.pkg)).id;
                      embed.addField("Commit", `https://gitlab.com/4tu/dragonite-test-repo/commit/${resp}`, true);
                      const status_msg = reaction.message.channel.send({ embed });

                      /*while (!await global.gitlabHelper.checkPipeline(submission.pkg.console)) {
                          await sleep(3000);
                      }*/

                      embed.setColor(0x85A352);
                      embed.setFooter('Package submission approved');
                      status_msg.then(function(msg) {
                          msg.edit({ embed });
                      });

                      var pubEmbed = new RichEmbed({
                          title: `${submission.pkg.type.toUpperCase()}: ${submission.pkg.info.title}`,
                          color: 0x2170BF,
                          fields: [
                              {
                                  name: 'Version',
                                  value: submission.pkg.info.version
                              },
                              {
                                  name: 'Link',
                                  value: frontendUrl.replace('%package%', submission.pkg.package)
                              }
                          ],
                          author: {
                              name: 'By ' + submission.pkg.info.author
                          }
                      });
                      reaction.message.client.guilds.get(config.discord.publicReleases.guild).channels.get(config.discord.publicReleases.channel).send({embed: pubEmbed });
                      // reaction.message.delete();
                    } catch(err) {
                        console.log(err);
                        reaction.message.channel.send(`Error while trying to commit to metadata repo!\n \`\`\`json\n${err}\`\`\``);
                        return;
                    }

                } else if (reaction.emoji.name == '❎') {
                    reaction.message.delete();
                    reaction.message.channel.send({embed: new RichEmbed({
                        title: submission.pkg.content.package,
                        color: 0xC73228,
                        footer: {text: 'Package submission denied'},
                        url: submission.pkg.info.url,
                        fields: [
                            {
                                name: 'Contact',
                                value: submission.pkg.submitter,
                                inline: true
                            }
                        ]
                    })} );
                }
                reaction.message.clearReactions();
                dtb.removePendingPackage(submission.uuid);
            }
        }
        return;
    }
}

module.exports.MessageHandler = MessageHandler;
module.exports.ReactionHandler = ReactionHandler;
module.exports.EndpointHandler = EndpointHandler;
