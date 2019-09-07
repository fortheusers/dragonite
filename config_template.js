const config = {

  discord: {
    // your bot's token from the bot creation page
    token: '', // it's a secret to everyone
    commandPrefix: '.',

    // All verification messages get sent here
    packageVerification: {channel: '', guild: ''},
    logging: {channel: '', guild: ''}
  },

  libget: {
    // list of get repo url's to check via the bot
    repos: ['', ''],
      
    // Max attempts at requesting something before giving up
    toleranceMax: 3
  },

  gitlab: {
    initOptions: {
      token: ''
    },

    // the project to commit to upon submission approval (lines up with get repo)
    projectIDs: {wiiu: '12759473', switch: '12759473'}
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
  },

  database: {
    pkgSalt: '',
    banSalt: '',
    metaSalt: ''
  }
};

module.exports = config;
