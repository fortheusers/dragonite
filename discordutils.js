const {discord, RichEmbed} = require('discord.js');
const geoip  = require('geoip-lite');
const fs = require('fs');
var config = require("./config.js");

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

const discordutils = class discordutils {
    static makeSubmissionEmbed(submission, ip) {
        const fields = [
            {title: "Package", val: "package", inl: true},
            {title: "Title", val: "info.title", inl: true},
            {title: "Author", val: "info.author", inl: true},
            {title: "Version", val: "info.version", inl: true},
            {title: "URL", val: "info.url", inl: false},
            {title: "Description", val: "info.description", inl: false},
            {title: "Category", val: "info.category", inl: true},
            {title: "License", val: "info.license", inl: true},
            {title: "Console", val: "console", inl: true},
            {title: "Contact", val: "submitter", inl: true},
            {title: "Details", val: "info.details", inl: false},
        ];

        const geoness = geoip.lookup(ip);

        let embed = new RichEmbed({
            title: 'Package submission received',
            color: 0x2170BF,
        });

        for (const field of fields) {
            let val = undefined;
            try {
                //this is, in fact, not the worst thing I've ever done - Ash
                val = eval('submission.pkg.' + field.val).replace(/\\n/g, '\n');
            } catch (e) {
                continue;
            }
            if (val !== undefined) {
                embed.addField(field.title, val, field.inl);
            }
        }

        if (ip) embed.addField('IP', ip, true);
        if (geoness && geoness.timezone) embed.addField('Location', geoness.timezone, true);

        let files = []
        if (submission.pkg.assets && submission.pkg.assets.length > 0) {
            let txt = '';
            for (let asset of submission.pkg.assets) {
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
            embed.addField('Assets', txt || "No assets found");
        }

        let qaURL = new URL(config.discord.qaUrl);
        qaURL.search = `?${submission.uuid}`;
        embed.addField("QA URL", qaURL.href);

        return {embed, files};
    } //makeSubmissionEmbed

    static makeQAPassEmbed(submission) {
        const fields = [
            {title: "Package", val: "package", inl: true},
            {title: "Title", val: "info.title", inl: true},
            {title: "Author", val: "info.author", inl: true},
            {title: "Version", val: "info.version", inl: true},
            {title: "URL", val: "info.url", inl: false},
            {title: "Description", val: "info.description", inl: false},
            {title: "Category", val: "info.category", inl: true},
            {title: "License", val: "info.license", inl: true},
            {title: "Console", val: "console", inl: true},
            {title: "Contact", val: "submitter", inl: true},
            {title: "Details", val: "info.details", inl: false},
        ];

        let embed = new RichEmbed({
            title: 'Package passed QA',
            color: 0x2170BF,
        });

        for (const field of fields) {
            let val = undefined;
            try {
                //this is, in fact, not the worst thing I've ever done - Ash
                val = eval('submission.pkg.' + field.val).replace(/\\n/g, '\n');
            } catch (e) {
                continue;
            }
            if (val !== undefined) {
                embed.addField(field.title, val, field.inl);
            }
        }

        let files = []
        if (submission.pkg.assets && submission.pkg.assets.length > 0) {
            let txt = '';
            for (let asset of submission.pkg.assets) {
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
            embed.addField('Assets', txt || "No assets found");
        }

        return {embed, files};
    } //makeQAPassEmbed
} //discordutils

module.exports = discordutils;
