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
        if (subpackage.type == 'new') { //TODO Updates
            commitJson = {package: subpackage.package, info: subpackage.info, changelog: "", assets: []};
        }
        let commitFiles = [{action: 'create', filePath: subpackage.package + '/pkgbuild.json', content: ''}];
        subpackage.assets.forEach(asset => {
            switch (asset.type) { //TODO single files
                case 'icon':
                case 'screen':
                    if (asset.format == 'url')
                    {
                        commitJson.assets.push({url: asset.data, type: asset.type});
                    }else if (asset.format == 'base64') {
                        commitJson.assets.push({url: asset.type + '.png', type: asset.type});
                        commitFiles.push({action: 'create', filePath: subpackage.package + '/' + asset.type + '.png', encoding: 'base64', content: asset.data});
                    }
                case 'zip':
                    commitJson.assets.push(asset);
            }
        });
        commitFiles[0].content = JSON.stringify(commitJson);
        
        this.api.Commits.create(config.gitlab.projectIDs[0], "master", `${subpackage.type}: ${subpackage.package} (${subpackage.info.version})`, commitFiles);
    }
}
module.exports = GitlabHelper;