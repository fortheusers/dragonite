const {v4: uuidv4} = require('uuid');
const GithubHelper = require('./github');

const Submission = class Submission {

constructor(pkg, uuid, msgid) {
    this.pkg = pkg;
    if (uuid) {
        this.uuid = uuid;
    } else {
        this.uuid = uuidv4();
    }
    this.discord_id = msgid;
}

setDiscord(msgid) {
    this.discord_id = msgid;
}

async getGitHubRelease() {
    const extensions = {
        "switch": [".nro"],
        "wiiu": [".rpx", ".elf"],
    };
    const consoleExtensions = extensions[this.pkg.console];
    if (consoleExtensions === undefined) {
        console.warn(`[Approval] WARNING: Unsupported console on package \
                      ${this.pkg.package} - "${this.pkg.console}"?`)
        consoleExtensions = [".elf"];
    }

    const hasGoodAsset = this.pkg.assets.some(asset =>
        asset.type === 'zip' ||
        consoleExtensions.some(ext =>
            asset.data.endsWith(ext)
        )
    );
    if (hasGoodAsset) return;

    var gh = new GithubHelper();
    var releases = await gh.getReleases(this.pkg.info.url, '.zip');

    let release = releases.find(release =>
        release.name.includes(this.pkg.console)
    )
    if (release !== undefined && release.browser_download_url !== undefined) {
        this.pkg.assets.push({
            type: 'zip',
            url: release.browser_download_url,
            zip: [{path: '/**', dest:'/', type: 'update'}]
        });
        return;
    }

    let foundBinary = false;
    for (const ext of consoleExtensions) {
        let binRelease = await gh.getRelease(this.pkg.info.url, ext);
        if (binRelease !== null && binRelease !== undefined) {
            this.pkg.assets.push({
                type: 'update',
                url: binRelease,
                dest: `/${this.pkg.console}/${this.pkg.package}/${this.pkg.package}${ext}`
            });
            foundBinary = true;
            break;
        }
    };

    if (!foundBinary) {
        throw new Error(`Could not find ${this.pkg.console} zip or binary-like assets (${consoleExtensions.join()}) on GitHub release!`);
    }
} //getGitHubRelease()

} //class Submission

module.exports = Submission;
