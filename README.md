## Dragonite
![logo](logo.png)

A discord bot for managing [hb-appstore](https://gitlab.com/4TU/hb-appstore) submissions, approvals, update checking, and cross-posting to other channels.

To configure, edit `config.json` with different appropriate values. Most fields can be left blank, but if they are then that feature won't be running when Dragonite comes up, alongside a message in the console explaining what is and isn't working.

![process](https://cdn.discordapp.com/attachments/546092197091737602/591638120907407360/Untitled_sasDiagram.png)

### Approvals
When a new app is detected either from [submitter](https://gitlab.com/4TU/submitter) or via update-checking, a message is posted into the Discord channel specified by `config.discord.packageVerification.channel`.

The information about the update and where to find it can then be validated by approved appstore repository maintainers. If the update is approved, it will be committed to one of the metadata repos, depending on which platform the package is intended for. If a Github or Gitlab URL is specified, updates can be automatically tracked and mapped from source, although they will still require approval.

### Committing
By filling out the Gitlab target repo information in `config.gitlab`, upon an approval, Dragonite is able to actually go and make the commit to the appropriate metadata repo without manual intervention or anyone running git themselves. These metadata git repos are lightweight representations of the App Store that provide informations to our [ci-scripts](https://gitlab.com/4TU/ci-scripts), which read from the metadata to compile the actual [libget](https://gitlab.com/4TU/libget) binaries, zips, and repo that are actually read by console clients.

Keeping all of the metadata in a repo like this allows us to transparently show where we are sourcing our packages from, as well as providing detailed history about the state of the libget repo and what changes are being made.

### Updates
A Github API key can be provided in `config.github`, which will then enable automatic update checking for packages that have it enabled in our metadata. Periodically, or when being invoked by a staff member, all trackable packages' releases pages are polled to see if newer versions of their releases are available. If so, this information is presented in the same Discord channel for package verification.

At this point, a repo maintainer can manually ensure that the target update will be able to automatically update via the mapped assets in the existing metadata. If it can be automatically merged, it can be approved right there just like submissions are. If it cannot be, then we will have to manually fix the assets information in the metadata.

In the future, Dragonite may be able to directly manage this asset information over Discord chat, but until then we will have to manually adjust this mapping either in Git or via a new Submission.

### Submissions
Submissions are intended to come from various sources in a generic format. Our [submitter](https://gitlab.com/4TU/submitter) page posts directly to the submissions endpoint, as well as Dragonite's own update checker.

An HTTP server is listening on `config.http.port` (default 457) for POST requests to `/package` of the following format:

```
{
    "package": "Bestapp",
    "type": "new",
    "version": "1.0",
    "trackGithub": false,
    "url": "https://github.com/4TU/Bestapp/releases",
    "info": {
        "title": "Best app",
        "author": "Someone",
        "details": "Hello World!\\nDetails section",
        "category": "tool",
        "description": "Hello World!",
        "license": "n/a"
    },
    "assets": [
        {
            "type": "icon",
            "format": "url",
            "data": "https://www.switchbru.com/appstore/packages/solarus/icon.png"
        },
        {
            "type": "screen",
            "format": "url",
            "data": "https://www.switchbru.com/appstore/packages/solarus/screen.png"
        },
        {
            "type": "zip",
            "url": "https://github.com/vgmoose/sdl-hello-world/archive/1.1.zip",
            "autoManifest": true,
            "zip": [
                {
                    "path": "/sd/overridethisdir/*",
                    "dest": "/",
                    "type": "update"
                }
            ]
        }
    ]
}
```

This format is an extended version of the eventual pkgbuild.json metadata that will be commited into one of the two metadata repos.

### Management
Some packages might not longer be able to have prebuilt binaries sourced from external URLs, or require more complicated config information. In these cases, we will mirror these packages on mirror.fortheusers.org, and use that URL in our metadata. To make this more convenient, Dragonite has the ability to SSH into a server specified in `config.ssh` and check for whicher packages have been edited/added manually.

It will then move them into the appropriate position, over SSH, for mirroring, and submit to itself the information so that it can be approved and finally committed to the store.
