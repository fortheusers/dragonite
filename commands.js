const config = require('./config');
const GithubHelper = require('./github');
const SSHRemote = require('./ssh');
const { discord, RichEmbed } = require('discord.js');
const http = require("https");


const commands = {
    'nrefresh': {
        requiredPermissions: ['BAN_MEMBERS'],
        action: async function(msg, command) {
            // create a new SSH session to our remote server
            const sshRemote = new SSHRemote();
            await sshRemote.init(config.ssh);

            await sshRemote.cd("mirror.fortheusers.org");
            let res = await sshRemote.ls();
            msg.channel.send(res);
        }
    },
    'refresh': {
        requiredPermissions: ['BAN_MEMBERS'],
        action: async function (msg, command) {
            const cmds = msg.content.split(/ +/);
            cmds.shift();
            const repo = cmds.length ? cmds[cmds.length - 1] : 'switch';
            const url = `${repo}bru.com`;
            var options = {
                host: url,
                port: 443,
                path: '/appstore/repogen.py',
                method: 'GET'
            };
            msg.channel.send(`Refreshing ${url}...`);

            http.request(options, function(res) {
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    msg.channel.send(chunk.replace(/<br>/g, ""));
                });
            }).end();
        }
    },
    'search': {
        requiredPermissions: [],
        action: async function (msg, command) {
            const cmds = msg.content.split(/ +/);
            cmds.shift();
            const query = cmds.join(" ").toLowerCase();
            var options = {
                host: `switchbru.com`,
                port: 443,
                path: '/appstore/repo.json',
                method: 'GET'
            };

            http.request(options, function(res) {
                res.setEncoding('utf8');
                let resp = "";
                res.on('data', function (chunk) {
                    resp += chunk;
                });
                res.on('end', function () {
                    const repo = JSON.parse(resp)['packages'];
                    const res = repo.filter(pkg =>  {
                        return (pkg.name && pkg.name.toLowerCase().includes(query)) ||
                            (pkg.title && pkg.title.toLowerCase().includes(query)) ||
                            (pkg.author && pkg.author.toLowerCase().includes(query)) ||
                            (pkg.details && pkg.details.toLowerCase().includes(query)) ||
                            (pkg.description && pkg.description.toLowerCase().includes(query));
                    });
                    const res2 = res.map(p => `[${p.title}](https://apps.fortheusers.org/switch/${p.name}) by ${p.author} / ${p.description}`);
                    res2.length = 10;
                    const blurb = new RichEmbed({
                        color: 0x2277aa,
                        description: res2.join("\n"),
                        footer: {text: "apps.fortheusers.org"}
                    });
                    msg.channel.send(blurb);
                });
            }).end();
        }
    },
    'updates': {
        requiredPermissions: ['BAN_MEMBERS'],
        action: async function(msg, command) {
            let toleranceCount = 0;
            let github = new GithubHelper();
            let IGNORE_URL = "https://wiiubru.com/appstore/ignore.json";
	    let IGNORE_TIME_URL = "https://wiiubru.com/appstore/ignore_by_time.json";

	    let targetedRepo = null;
	    if (command.length > 1) {
		    // we were given an argument, apply it as the targeted repo
		    targetedRepo = command.pop();
	    }

            // pull in the ignore json data into an object
            let ignoreData = {};
            await new Promise((resolv1, reject2) => {
                http.get(IGNORE_URL, response => {
                    let body = "";
                    response.on('data', chunk => {
                        body += chunk;
                    });
                    response.on('end', function(){
                        try {
                            ignoreData = JSON.parse(body);
                            resolv1();
                        } catch (e) {
                            msg.channel.send(new RichEmbed({
                                color: 0xC73228,
                                title: e.name + ' while parsing ignore JSON',
                                description: e.message,
                                footer: {text: `URL: ${IGNORE_URL}`}
                            }));
                            reject2(e);
                            return;
                        }
                    });
                    response.on('error', e => {
                        msg.reply(`Error occured while getting ignore list data at: ${IGNORE_URL}`);
                        reject2(e);
                    });
                });
            });

            let updatesFound = false;

            for (let repo of config.libget.repos) {
		if (targetedRepo && repo.indexOf(targetedRepo) == -1) {
			// we had a targeted repo, and this one doesn't match, sos kip
			continue;
		}
                msg.channel.send(`Checking repo: <${repo}>`);
                http.get(repo + 'repo.json', response => {
                    let body = "";
                    response.on('data', chunk => {
                        body += chunk;
                    });
                    response.on('end', function(){
                        let giveup = false;
                        let packages;
                        try {
                            packages = JSON.parse(body)['packages'];
                        } catch (e) {
                            msg.channel.send(new RichEmbed({
                                color: 0xC73228,
                                title: e.name + ' while parsing JSON',
                                description: e.message,
                                footer: {text: `Repo: ${repo}`}
                            }));
                            return;
                        }
                        for (let package of packages) {
                            if(!giveup) {
                                let pkgVersion = package.version.toLowerCase().replace(/^v/, '');
                                github.githubCheck(package.url, pkgVersion, package.name).then(gCheck =>{
                                    let gVersion = gCheck.version.toLowerCase().replace(/^v/, '');
                                    // skip if the version is in our ignore data and the package matches
                                    if (ignoreData[package.name] && ignoreData[package.name] == gVersion) {
                                        return;
                                    }
                                    const outOfDate = new RichEmbed({
                                        color: 0xFF9900,
                                        title: `${package.name} may be out of date`,
                                        description: `Ours is: \`${package.version}\`\nGithub's is:\`${gVersion}\`\n[Release Link](${gCheck.url})`,
                                        footer: {text: repo},
                                        url: gCheck.url
                                    });
                                    msg.channel.send(outOfDate);
                                    updatesFound = true;
                                    toleranceCount = 0;
                                }, e => {
                                    if (e.status != 200 && !giveup) {
                                        msg.channel.send(package.name);
                                        msg.channel.send('Github responded with status `' + e.status + '` while checking <' + e.url + '>');
                                        toleranceCount++;
                                        if (toleranceCount >= config.libget.toleranceMax) {
                                            msg.reply(`Gave up checking repos for updates in get repo ${repo} after ${config.libget.toleranceMax} attempts!`);
                                            giveup = true;
                                        }
                                    }
                                });
                            }
                        }
                    });
                    response.on('error', e => {
                        msg.reply(`Error occured while getting repo json, ${e.name}: ${e.message}`);
                    });
                });
            }

            // Fetch a random GIF from Giphy API
            function getRandomGifFromAPI(callback) {
                const apiKey = 'YOUR_GIPHY_API_KEY';
                const url = `https://api.giphy.com/v1/gifs/random?api_key=${apiKey}&tag=no%20updates&rating=g`;

                https.get(url, (res) => {
                    let data = '';
                    res.on('data', chunk => {
                        data += chunk;
                    });
                    res.on('end', () => {
                        try {
                            const jsonData = JSON.parse(data);
                            const gifUrl = jsonData.data.images.original.url;
                            callback(gifUrl); // Pass the GIF URL to the callback
                        } catch (e) {
                            console.error('Error fetching GIF from Giphy API:', e);
                            callback(null);
                        }
                    });
                });
            }

            // After all repos are checked, fetch and send a random GIF if no updates were found
            if (!updatesFound) {
                getRandomGifFromAPI((gifUrl) => {
                    if (gifUrl) {
                        const embed = new RichEmbed()
                            .setColor(0x00FF00)
                            .setTitle("No Updates Found!")
                            .setImage(gifUrl); // Attach the random GIF from Giphy
                        msg.channel.send(embed);
                    } else {
                        msg.channel.send("No updates found, but I couldn't fetch a GIF this time.");
                    }
                });
            }
        }
    },
    "test": {
        requiredPermissions: ['BAN_MEMBERS'],
        action: async function(){
            var a = http.request({method: 'POST', hostname: '127.0.0.1', port: config.http.port, path: '/package', headers: {'Content-Type': 'application/json'}});
            a.write(JSON.stringify({"package":"Bestapp","type":"new","version":"1.0","trackGithub":false,"url":"https://github.com/4TU/Bestapp/releases","info":{"title":"Best app","author":"Someone","details":"Hello World!\\nDetails section","category":"tool","description":"Hello World!","license":"n/a"},"assets":[{"type":"icon","format":"base64","data":"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v3/6059w//33u8ZiA/R6RaT27duHV155BQcOHBDJVXJ9werVq/HAAw8gk8kIQPLll1+uqMQ8dOiQoEczdY4ma2H58uWu6siTTz4ZU6dORTabtdr3FH79t3/7N/z85z9X5kLcdttt+NSnPoVCoYD+/n4RXVE1grFtv6dydYrFYiUpqK69lurmpVLJRfvs54rH45g/fz7uvPNOfP/738cf//hHl8Z6/vnnsXfv3grgrNpr7ty5rgqs119/Hd/85jdx0UUXYdSoUdi3bx+eeeYZPP3008hkMli9ejUmTZpU0YmHrv379+POO+/EsGHDMHLkSHzzm9+smINXX30VX/va19Dd3Y3rrrsO559/Pi655BJx+BzHwauvvoo77rgDc+bMgeM4eOWVVyrSj6kSUCY6tdUIpVIJQ4YMwcyZM7F582YUCgVs3boVANDe3o6RI0cKboQdO3Zg+/bt4t4nnHACjjnmGJewLJfLGDRoEC644AKBVZTLZTz//PNYtGiRqAZ8/vnnXcKxqakJH/3oRz272XrRfGcyGXznO9/B8ccfj2KxiB//+MeYMmUKJk+eLNJyi8UiHnnkEfT19WHChAk4fPgwnnvuOXzwwQeug00EMPfcc4+WppxStEulkitODwDXXHONqKq0irv/N4/CU089VeFqzpw5E1/4whfwsY99DIlEwsVOTT0HeSi4WgCVIjZkAjn0ymQyrhenPKIXp0fq6+tz8vm8oAGr9nrkkUec6dOnO4lEwkXhRLReMiXY6NGjna6uror7bN261UmlUuJzn//8511/v/XWW51YLCb+3tzc7HzhC19wvvOd7zg33XSTc8wxx4i/JZNJ59vf/ragU8pkMk57e7uSauqEE05wyuWy88ILL2hpse6++27HcRxn7969zgknnFDx97a2NufYY4+teP/UU091ent7nWw26/T09DhdXV3OoUOHnIMHDzoHDhywfhWLRecHP/hBxf1vvPFGQSH1z//8zxV//9rXvubk83mns7PT9erp6XFWrVrlmjN6HXfccc7IkSNd74VCIefyyy8XlGiO4ziPPfaY6zMPPfSQ4ziOoJajV7lcds477zzlvCYSCWfv3r2O4zjOokWLnGg0WvG77e3tztChQ8V7ra2tTigUEv8/adIkcQY4fVdPT4/T3d3t9PT0OOVy2XnttdeceDwuvjd58mTn0KFDTj6f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"},{"type":"screen","format":"url","data":"https://www.switchbru.com/appstore/images/noscreen.png"},{"type":"zip","url":"https://github.com/vgmoose/sdl-hello-world/archive/1.1.zip","files":[{"a":"a"}]}]}));
            a.end();
        }
    }
}

module.exports = commands;


