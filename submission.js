const {v4: uuidv4} = require('uuid');
const GithubHelper = require('./github');

const Submission = class Submission {

constructor(pkg, uuid, msgid) {
    this.pkg = pkg;
    if (uuid) {
        this.uuid = uuid;
    } else {
        console.log(`bad uuid ${JSON.stringify(uuid)}`)
        this.uuid = uuidv4();
    }
    this.discord_id = msgid;
}

setDiscord(msgid) {
    this.discord_id = msgid;
}

async getGitHubRelease() {
    var zipI = this.pkg.assets.indexOf(a => a.type === 'zip');
    var binI = this.pkg.assets.indexOf(a => a.format !== 'base64' && (a.data.endsWith('.nro') || a.data.endsWith('.rpx') || a.data.endsWith('.elf')));
    if (zipI === -1 && binI === -1) {
        var gh = new GithubHelper();
        var zipUrls = await gh.getReleases(this.pkg.info.url, '.zip');
        var zipUrl;
        if (zipUrls !== undefined && zipUrls.length > 1) {
            zipUrl = zipUrls.find(a => a.name.includes(this.pkg.console));
            if (zipUrl !== undefined)
            {
                zipUrl = zipUrl.browser_download_url;
            }
        }else if (zipUrls !== undefined && zipUrls.length > 0) {
            zipUrl = zipUrls[0].browser_download_url;
        }

        var binUrl;
        if (zipUrl === null || zipUrl === undefined || zipUrl === '') {
            switch (this.pkg.console) {
                case 'switch':
                    binUrl = await gh.getRelease(this.pkg.info.url, '.nro');
                    if (binUrl !== null && binUrl !== undefined) {
                        this.pkg.assets.push({type: 'update', url: binUrl, dest: `/switch/${this.pkg.package}/${this.pkg.package}.nro`});
                    }
                    break;
                case 'wiiu':
                    binUrl = await gh.getRelease(this.pkg.info.url, '.rpx');
                    var ext = '.rpx';
                    if (binUrl === null || binUrl === undefined) {
                        binUrl = await gh.getRelease(this.pkg.info.url, '.elf');
                        ext = '.elf';
                    }
                    if (binUrl !== null && binUrl !== undefined) {
                        this.pkg.assets.push({type: 'update', url: binUrl, dest: `/wiiu/apps${this.pkg.package}/${this.pkg.package}${ext}`});
                    }
                    break;
                default:
                    throw new Error(`The console ${this.pkg.console} is not supported by Dragonite auto-manifest but no predefined SD assets exist!`);
                    return;
            }

        } else {
            this.pkg.assets.push({type: 'zip', url: zipUrl, zip: [{path: '/**', dest:'/', type: 'update'}]});
        }

        if ((zipUrl === null || zipUrl == undefined) && (binUrl === null || binUrl === undefined)) {
            throw new Error('Could not find binary-like assets on GitHub release!');
            return;
        }
    }

} //getGitHubRelease()

} //class Submission

module.exports = Submission;
