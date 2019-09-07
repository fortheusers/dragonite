const config = require('./config');
const Octokit = require('@octokit/rest');
const octokit = new Octokit()

const GithubHelper = class GithubHelper {
    constructor() {
        this.octokit = new Octokit(config.github.initOptions);
    }
    
    async githubCheck(url, repoVersion, name) {
        if (!url.includes('//github.com/')) throw {status: 200, url: url};
        let parsedUrl = new URL(url).pathname;
        parsedUrl = parsedUrl.split('/');
        const user = parsedUrl[1];
        const repo = parsedUrl[2];
        const latestReleases = await this.octokit.repos.listReleases({owner: user, repo: repo});
        if (latestReleases.status != 200) throw {status: latestReleases.status, url: url};
        const latestRelease = latestReleases.data[0];
        if (latestRelease === undefined || latestRelease.length == 0) {
            console.warn(`Repo ${repo} found to have no releases`);
            throw {status: 200, url: url};
        }
        const formattedVersion = latestRelease.tag_name.toLowerCase().replace(/^v/, '')
            .replace(/switch/g, "")
            .replace(new RegExp(name.toLowerCase(), "g"), '')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
        if (formattedVersion !== repoVersion)
            return {status: latestReleases.status, url: latestRelease.html_url, version: formattedVersion, name: latestRelease.name};
        throw {status: latestReleases.status, url: url};
    }

    async getRelease(url) {
        let parsedUrl = new URL(url).pathname;
        parsedUrl = parsedUrl.split('/');
        const user = parsedUrl[1];
        const repo = parsedUrl[2];
        const latestReleases = await this.octokit.repos.listReleases({owner: user, repo: repo});
        if (latestReleases.status != 200) throw {status: latestReleases.status, url: url};
        const latestRelease = latestReleases.data[0];
        if (latestRelease === undefined || latestRelease.length == 0) {
            console.warn(`Repo ${repo} found to have no releases`);
            return;
        }
        return latestRelease.assets[0].browser_download_url;
    }
}

module.exports = GithubHelper;