var config = require("./config.js");
const commands = require('./commands');
const express = require('express');
const {discord, RichEmbed} = require('discord.js');

const MessageHandler = class MessageHandler{
    handleCommand(msg) {
        if (msg.content.startsWith(config.commandPrefix)) {
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
        this.app.use(express.json());

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
                client.guilds.get(config.packageVerification.guild).channels.get(config.packageVerification.channel).send(embed).then(msg => {
                    pendingPackages.push({id: msg.id, content: reqFormat});
                    console.log(pendingPackages);
                    msg.react('✅');
                    msg.react('❎');
                });
                res.status(200).end();
            } catch (e) {
                res.status(400).send({error: e.name, message: e.message}).end();
                return;
            }
        });
        this.app.listen(this.port, () => console.log(`Endpoint handler listening on port ${this.port}!`));
    }
}

const ReactionHandler = class ReactionHandler {
    static handleReaction(reaction, user) {
        const id = reaction.message.id;
        console.log(reaction);
        if (reaction.users.size == 2) {
            const i = pendingPackages.findIndex(a => {
                return a.id == id;
            });
            console.log(pendingPackages);
            if (i != -1) {
                if (reaction.name == '✅') {
                    reaction.message.edit(new RichEmbed({
                        title: 'Package submission approved',
                        color: 0x85A352,
                        fields: [{
                            title: 'Package',
                            value: pendingPackages[a].content.package
                        }],
                        thumbnail: 'https://github.com/google/material-design-icons/raw/master/action/drawable-xxhdpi/ic_done_white_48dp.png'
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