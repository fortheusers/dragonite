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
}
module.exports = GitlabHelper;