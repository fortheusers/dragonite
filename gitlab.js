const gitlab = require("gitlab");
const config = require("./config");

const GitlabHelper = class GitlabHelper {
    constructor() {
        this.api = new gitlab.Gitlab(config.gitlab.initOptions);
    }
    testCommit() {
        this.api.Commits.create(config.gitlab.projectID, "master", "Test commit", [{
            action: 'create',
            filePath: 'test.txt',
            content: 'Hello World!'
        }]);
    }

    commitPackage(subpackage) {
        var commitJson;
        if (subpackage.type == 'new' || subpackage.type === undefined /* In the case of no type, assume new */) { //TODO Updates
            commitJson = {package: subpackage.package, info: subpackage.info, changelog: "", assets: []};
        }
        let commitFiles = [{action: 'create', filePath: subpackage.package + '/pkgbuild.json', content: ''}];
        subpackage.assets.forEach(asset => {
            switch (asset.type) {
                case 'icon':
                case 'screen':
                case 'screenshot':
                    if (asset.format == 'url')
                    {
                        commitJson.assets.push({url: asset.data, type: asset.type});
                    }else if (asset.format == 'base64') {
                        commitJson.assets.push({url: asset.type + '.png', type: asset.type});
                        commitFiles.push({action: 'create', filePath: subpackage.package + '/' + asset.type + '.png', encoding: 'base64', content: asset.data.substr(22)});
                    }
                    break;
                case 'zip':
                case 'update':
                case 'get':
                case 'local':
                case 'extract':
                    commitJson.assets.push(asset);
                    break;
            }
        });
        commitFiles[0].content = JSON.stringify(commitJson, null, 1);

        return this.api.Commits.create(config.gitlab.projectIDs[subpackage.console], "master", `${subpackage.type}: ${subpackage.package} (${subpackage.info.version})`, commitFiles, {author_email: "dragonite@fortheusers.org", author_name: "Dragonite Bot"});
    }

    commitReview(review) {
        let commitFiles = [{action: 'create', filePath: '/_data/reviews/' + review.uuid + '.json', content: ''}];
        commitFiles[0].content = JSON.stringify(review, null, 1);

        return this.api.Commits.create(config.gitlab.qaID, "master", `[QA] ${review.accept} ${review.package.info.title}`, commitFiles, {author_email: "dragonite@fortheusers.org", author_name: "Dragonite Bot"});
    }

    async checkPipeline(repo) {
        var pipes = await this.api.Pipelines.all(config.gitlab.projectIDs[repo]);
        return pipes[0].status === 'success';
    }
}
module.exports = GitlabHelper;
