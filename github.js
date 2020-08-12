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

    async getRelease(url, extension = null) {
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
        if (extension == null) {
            return latestRelease.assets[0].browser_download_url;
        } else {
            var a = latestRelease.assets.find(a => a.name.endsWith(extension));
            if (a !== null && a !== undefined) {
                return a.browser_download_url;
            }
        }
    }

    async getReleases(url, extension = null) {
        const parsedUrl = new URL(url);
        if (parsedUrl.host !== "github.com") {
            console.warn("URL for repository is not a GitHub URL");
            throw new Error("URL for repository is not a GitHub URL");
            return;
        }
        const pathSegments = parsedUrl.pathname.split('/');
        const user = parsedUrl[1];
        const repo = parsedUrl[2];
        if (user == "" || repo == "") {
            console.warn("GitHub URL for repository seems malformed");
            throw new Error("GitHub URL for repository seems malformed");
            return;
        }
        const latestReleases = await this.octokit.repos.listReleases({owner: user, repo: repo});
        if (latestReleases.status != 200) {
            console.warn(`GitHub returned error ${latestRelease.status} for ${user}/${repo}`);
            throw new Error(`GitHub returned error ${latestRelease.status} for ${user}/${repo}`);
            return;
        }
        const latestRelease = latestReleases.data[0];
        if (latestRelease === undefined || latestRelease.length == 0) {
            console.warn(`Repo ${repo} found to have no releases`);
            return;
        }
        if (extension == null) {
            return latestRelease.assets;
        } else {
            var a = latestRelease.assets.filter(a => a.name.endsWith(extension));
            if (a !== null && a !== undefined) {
                return a;
            }
        }
    }
}

module.exports = GithubHelper;
