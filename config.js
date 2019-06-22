const config = {

  discord: {
    // your bot's token from the bot creation page
    token: '', // it's a secret to everyone
    commandPrefix: '.',

    // All verification messages get sent here
    packageVerification: {channel: '586650866086576157', guild: '339118412414582786'}
  },

  libget: {
    // list of get repo url's to check via the bot
    repos: ['https://switchbru.com/appstore/', 'https://switchbru.com/appstore/'],
      
    // Max attempts at requesting something before giving up
    toleranceMax: 3
  },

  gitlab: {
    initOptions: {
      token: ''
    },

    // the project to commit to upon submission approval (lines up with get repo)
    projectIDs: ['12759473', '12759473']
  },

  github: {
    initOptions: {
        auth: ''
    }
  },

  ssh: {
    user: '',
    server: '',
    keyPath: ''
  },

  http: {
    port: 457
  }
};

module.exports = config;