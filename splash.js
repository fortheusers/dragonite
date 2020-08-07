const fs = require('fs');
const config = require('./config');

const showSplash = () => {
  console.log("Starting services...");

  const splash = 'splash.txt';
  if (fs.existsSync(splash)) {
      process.stdout.write(fs.readFileSync(splash));
  }

  // config checks at startup

  // Check DB salt

  if (config.database.banSalt.length < 8 || config.database.banSalt.length < 8 || config.database.banSalt.length < 8 || config.database.banSalt == config.database.metaSalt == config.database.pkgSalt)
  {
      console.log('❌ [Database] *** Insecure salt in config.js! Please use different values of 8 chars or more ***');
      console.log('Exiting...');
      process.exit(1);
  }

  // Check Discord
  if (config.discord.token)
      console.log("✅ [Approvals] Discord tokens present, ready to connect")
  else
      console.log("❌ [Approvals] Missing Discord BOT token in config")

  if (config.discord.packageVerification)
      console.log("✅ [Approvals] Discord verification channel present")
  else
      console.log("❌ [Approvals] Missing packageVerification channel in config")

  if (config.discord.publicReleases)
      console.log("✅ [Approvals] Discord announcement channel present")
  else
      console.log("❌ [Approvals] Missing publicReleases channel in config")

  // Check SSH
  if (config.ssh.user && config.ssh.server)
      console.log("✅ [Management] Remote details present, ready to connect to SSH server")
  else
      console.log("❌ [Management] SSH Creds not specified, missing one of: user, server")

  // Check Gitlab
  if (config.gitlab.initOptions.token)
      console.log("✅ [Committing] Gitlab token present")
  else
      console.log("❌ [Committing] Missing Gitlab token in Config")

  // Check Github
  if (config.github.initOptions.auth)
      console.log("✅ [Updates] Github token present")
  else
      console.log("❌ [Updates] Missing Github token in Config")
};

module.exports = { showSplash };
