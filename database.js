const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const crypto = require('crypto');
const moment = require('moment');
var config = require("./config.js");
const Submission = require('./submission');

const Database = class Database {
    constructor() {
        const adapter = new FileSync('db.json');
        this.db = low(adapter);
        this.db.defaults({ packageOwnership: [], bans: [], meta: [], pendingPackages: [], pendingPackagesQA: [] })
            .write();
        this.db.read();
        console.log(`✅ [Database] Lowdb database running with ${this.db.get('packageOwnership').size()} users, ${this.db.get('pendingPackages').size()} packages pending`);
    }

    pushPendingPackage(submission) {
        let existingEntry = this.db.get('pendingPackages').find({uuid: submission.uuid}).value();
        if (existingEntry === undefined) {
            this.db.get('pendingPackages').push({
                uuid: submission.uuid,
                discord_id: submission.discord_id,
                pkg: submission.pkg
            }).write();
        } else {
            throw new Error("Package already pending in database!");
        }
    }

    pushQAPendingPackage(submission) {
        let existingEntry = this.db.get('pendingPackagesQA').find({uuid: submission.uuid}).value();
        if (existingEntry === undefined) {
            this.db.get('pendingPackagesQA').push({
                uuid: submission.uuid,
                discord_id: submission.discord_id,
                pkg: submission.pkg
            }).write();
        } else {
            throw new Error("Package already pending in database!");
        }
    }

    getAllQAPendingPackages() {
        const dbSubmissions = this.db.get('pendingPackagesQA').value();
        const submissions = dbSubmissions.map(pkg =>
            new Submission(pkg.pkg, pkg.uuid, pkg.discord_id)
        );
        return submissions;
    }

    getAllPendingPackages() {
        const dbSubmissions = this.db.get('pendingPackages').value();
        const submissions = dbSubmissions.map(pkg =>
            new Submission(pkg.pkg, pkg.uuid, pkg.discord_id)
        );
        return submissions;
    }

    getPendingPackageByDiscordID(discord_id) {
        const pkg = this.db.get('pendingPackages').find({
            discord_id: discord_id,
        }).value();
        if (pkg === undefined) return undefined;
        return new Submission(pkg.pkg, pkg.uuid, pkg.discord_id);
    }

    getQAPendingPackageByUUID(uuid) {
        const pkg = this.db.get('pendingPackagesQA').find({
            uuid: uuid,
        }).value();
        if (pkg === undefined) return undefined;
        return new Submission(pkg.pkg, pkg.uuid, pkg.discord_id);
    }

    removePendingPackage(uuid) {
        this.db.get('pendingPackages').remove({
            uuid: uuid,
        }).write();
    }

    removeQAPendingPackage(uuid) {
        this.db.get('pendingPackagesQA').remove({
            uuid: uuid,
        }).write();
    }

    pushPackage(packageName, getuuid) {
        if (this.isBanned(getuuid)) {
            return false;
        }
        const uuidhash = crypto.createHash('sha256').update(getuuid+config.database.pkgSalt).digest('hex');
        const metaEntry = this.metaFindEntry(getuuid);
        let ownerEntry = this.db.get('packageOwnership').find({uuid: uuidhash});
        if (ownerEntry.value() != undefined)
        {
            ownerEntry.get('packages').push({name: packageName}).write();
        }else {
            this.db.get('packageOwnership').push({uuid: getuuid, packages: [{name: packageName}], name: metaEntry.name}).write();
        }
        return true;
    }

    getPermittedPackages(getuuid) {
        if (this.isBanned(getuuid)) {
            return false;
        }
        let ownerEntry = this.db.get('packageOwnership').find({uuid: getuuid}).value();
        if (ownerEntry != undefined)
        {
            return ownerEntry.packages.value();
        }else {
            return [];
        }
    }

    metaFindEntry(getuuid, curip = undefined) {
        const uuidhash = crypto.createHash('sha256').update(getuuid+config.database.metaSalt).digest('hex');
        let metaEntry = this.db.get('meta').find({uuid: uuidhash}).value();

        if (metaEntry == undefined && curip != undefined)
        {
            getip = this.db.get('meta').find({lastip: curip}).value();
        }
        return metaEntry;
    }

    isBanned(getuuid, curip) {
        const uuidhash = crypto.createHash('sha256').update(getuuid+config.database.banSalt).digest('hex');

        let banEntry = this.db.get('bans').find({uuid: uuidhash}).value();
        const getip = this.metaFindEntry(getuuid, curip);

        if (banEntry != undefined) {
            const timeNow = moment().unix();
            return timeNow < banEntry.expiry || banEntry.expiry == -1;

        } else if (getip != undefined) {
            banEntry = this.db.get('bans').find({ip: getip.lastip}).value();
            if (banEntry != undefined)
            {
                const timeNow = moment().unix();
                return timeNow < banEntry.expiry || banEntry.expiry == -1;
            }
        }

        return false;
    }

    addBan(getuuid, getexpiry) {
        const uuidhash = crypto.createHash('sha256').update(getuuid+config.database.banSalt).digest('hex');
        const metaEntry = this.metaFindEntry(getuuid);
        let banEntry = this.db.get('bans').find({uuid: getuuid});

        if (banEntry.value() != undefined)
        {
            banEntry.set('expiry', getexpiry).write();
        } else {
            if (metaEntry.value() != undefined)
            {
                this.db.get('bans').push({uuid: uuidhash, expiry: getexpiry, ip: metaEntry.get('lastip').value()}).write();
            } else {
                this.db.get('bans').push({uuid: uuidhash, expiry: getexpiry}).write();
            }
        }
    }

    updateMeta(getip, getuuid, getname = undefined) {
        const uuidhash = crypto.createHash('sha256').update(getuuid+config.database.metaSalt).digest('hex');
        let metaEntry = this.db.get('meta').find({uuid: uuidhash});
        if (metaEntry.value() != undefined)
        {
            metaEntry.set('lastip', getip);
            if (getname != undefined) metaEntry.set('name', getname).write();
        } else {
            const pubid = crypto.createHash('sha256').update(getuuid+moment().unix().toString()).digest('hex');
            if (getname != undefined) this.db.get('meta').push({lastip: getip, uuid: uuidhash, name: getname, publicid: pubid}).write();
            else this.db.get('meta').push({lastip: getip, uuid: uuidhash}).write();
        }

    }
}

module.exports = Database;
