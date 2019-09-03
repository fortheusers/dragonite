var config = require("./config.js");
const commands = require('./commands');
const express = require('express');
const {discord, RichEmbed} = require('discord.js');
const fs = require('fs');
var AdmZip = require('adm-zip');

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
            res.set('Access-Control-Allow-Origin', '*');
            res.set('Access-Control-Allow-Headers', '*');
            res.set('Access-Control-Allow-Method', '*');

            let reqFormat = req.body;
            try {
                let embed = new RichEmbed({
                    title: 'Package submission received',
                    color: 0x2170BF,
                    fields: [
                        {
                            name: 'Package',
                            value: reqFormat.package,
                            inline: true
                        },
                        {
                            name: 'Type',
                            value: reqFormat.type,
                            inline: true
                        },
                        {
                            name: 'Track Github',
                            value: reqFormat.trackGithub,
                            inline: true
                        }
                    ]
                });
                if (reqFormat.info.title) embed.addField('Title', reqFormat.info.title, true);
                if (reqFormat.info.author) embed.addField('Author', reqFormat.info.author, true);
                if (reqFormat.info.description) embed.addField('Description', reqFormat.info.description, true);
                if (reqFormat.info.category) embed.addField('Category', reqFormat.info.category, true);
                if (reqFormat.info.license) embed.addField('License', reqFormat.info.license, true);
                if (embed.fields.length % 3 != 0) embed.addBlankField(true);
                if (embed.fields.length % 3 != 0) embed.addBlankField(true);
                if (reqFormat.info.details) embed.addField('Details', reqFormat.info.details.replace(/\\n/g, '\n'));
                if (reqFormat.assets && reqFormat.assets.length > 0) {
                    let txt = '';
                    for (let asset of reqFormat.assets) {
                        if (asset.type) {
                            switch (asset.type) {
                                case 'icon':
                                    if (asset.format && asset.format == 'url') embed.setThumbnail(asset.data);
                                case 'screen':
                                    if (asset.format && asset.format == 'url') embed.setImage(asset.data);
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
                    embed.addField('Assets', txt);
                }
                client.guilds.get(config.discord.packageVerification.guild).channels.get(config.discord.packageVerification.channel).send(embed).then(msg => {
                    pendingPackages.push({id: msg.id, content: reqFormat});
                    msg.react('✅');
                    msg.react('❎');
                });
                res.status(200).end();
            } catch (e) {
                res.status(400).send({error: e.name, message: e.message}).end();
                return;
            }
        });
        this.app.listen(this.port, () => console.log(`✅ [Submissions] Endpoint HTTP handler listening on port ${this.port}!`));
    }
}

const ReactionHandler = class ReactionHandler {
    static handleReaction(reaction, user) {
        const id = reaction.message.id;
        if (reaction.users.size == 2) {
            const i = pendingPackages.findIndex(a => {
                return a.id == id;
            });
            console.log(reaction);
            if (i != -1) {
                if (reaction.emoji.name == '✅') {
                    reaction.message.edit(new RichEmbed({
                        title: pendingPackages[i].content.package,
                        color: 0x85A352,
                        footer: {text: 'Package submission approved', iconURL: 'https://github.com/google/material-design-icons/raw/master/action/drawable-xxhdpi/ic_done_white_48dp.png'},
                        url: pendingPackages[i].content.package.url
                    }));
                } else if (reaction.emoji.name == '❎') {
                    reaction.message.edit(new RichEmbed({
                        title: pendingPackages[i].content.package,
                        color: 0xC73228,
                        footer: {text: 'Package submission denied'},
                        url: pendingPackages[i].content.package.url
                    }));
                }
                reaction.message.clearReactions();
                pendingPackages.splice(i, 1);
            }
        }
        return pendingPackages;
    }
}

module.exports.MessageHandler = MessageHandler;
module.exports.ReactionHandler = ReactionHandler;
module.exports.EndpointHandler = EndpointHandler;