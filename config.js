const config = {
    // your bot's token from the bot creation page
	token: '',
    // list of user IDs that can allow reposting of the content (allowed to react to repost)
    permitRepostFrom: ['309390326433579008', '277147928924258304', '284830486025469952'],
    // list of channels to monitor for repostable messages
    reportRepostFrom: ['586896283747221524'],
    // list of strings that when detected in a message, will get a repostable reaction to them
    reportRepostKeywords: [':nx:', ':wiiu:'],
    // list of channels to repost any and all content to
    reportRepostTo: ['586896547547971585'],
    // the emoji used to signify a repost (should, line up with the repostable_channels list)
    // see: https://discordjs.guide/popular-topics/reactions.html#unicode-emojis
    // unicode emoji for standard ones, IDs for custom ones
    reportRepostReactions: ['339140869275910151', '🐦'], // homebrew emoji, bird emoji

    commandPrefix: '.',

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
    }
};

module.exports = config;