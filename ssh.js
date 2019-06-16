const SSHClient = require('ssh2').Client;
const fs = require('fs');

class SSHRemote {
    // info about the SSH server:
    //    ssh -i keyPath user@server -p port
    // keyPass is used to decrypt the private key if it's encrypted
    // there is no way to specify a password for auth right now, only private keys
    async init({
        user,
        server,
        keyPath,
        keyPass = null,
        port = 22
    }) {
        if (!user || !server || !keyPath) {
            console.log("Error: SSH creds not specified, missing one of: user, server, keyPath");
            return;
        }

        this.ssh = new SSHClient();
        this.cwd = "~";

        await new Promise((resolve, reject) => {
            this.ssh.on('ready', () => {
                resolve("Connected to remote SSH server");
             }).connect({
                 host: server,
                 port,
                 username: user,
                 privateKey: fs.readFileSync(keyPath),
                 passphrase: keyPass
             });
        });
    }

    // executes the command in the current directory, and returns the response
    async cmd(command) {
        const self = this;
        const end = new Promise(function (resolve, reject) {
            let res = "";
            self.ssh.exec(`cd ${self.cwd} && ${command}`, function (err, stream) {
                if (err) { reject("Couldn't execute command") }

                stream.on('end', function(data) {
                    resolve(res);
                });
                stream.on('data', function(data) {
                    res += `${data}`;
                });
            });
        });

        return await end;
    }

    async cd(dir) {
        // we don't actually have a shell session, so we'll manage a fake
        // cwd variable that we cd into before every run
        if (dir.indexOf("/") == 0) {
            // path is absolute, just replace cwd
            this.cwd = dir;
            return;
        }

        // relative path, append
        this.cwd += `/${dir}`;
    }

    async ls() {
        return this.cmd("ls");
    }
};

module.exports = SSHRemote;