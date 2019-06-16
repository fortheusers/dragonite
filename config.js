const config = {
    // your bot's token from the bot creation page
	token: '', // it's a secret to everyone

    commandPrefix: '.',

    // All verification messages get sent here
    packageVerification: {channel: '586650866086576157', guild: '339118412414582786'},

    // list of get repo url's to check via the bot
    getRepos: ['http://switchbru.com/appstore/'],
    
    // Max attempts at requesting something before giving up
    toleranceMax: 3,

    gitlab: {
        initOptions: {
            token: ''
        },
        projectID: '12759473'
    },

    github: {
        initOptions: {
            auth: ''
        }
    },

    ssh: {
        user: '',
        server: '',
        keyPath: '',
        keyPass: '' // TODO: prompt for this via input instead of keeping in config
    }
};

module.exports = config;