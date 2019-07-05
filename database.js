const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const Database = class Database {
    constructor() {
        const adapter = new FileSync('db.json');
        this.db = low(adapter);
        this.db.defaults({ packageOwnership: [] })
            .write();
        this.db.read();
        console.log(`✅ [Database] Lowdb database running with ${this.db.get('packageOwnership').size()} users!`);
    }

    pushPackage(packageName, getuuid) {
        let ownerEntry = this.db.get('packageOwnership').find({uuid: getuuid});
        if (ownerEntry.value() != undefined)
        {
            ownerEntry.get('packages').push({name: packageName}).write();
        }else {
            this.db.get('packageOwnership').push({uuid: getuuid, packages: [{name: packageName}]}).write();
        }
    }

    getPermittedPackages(getuuid) {
        let ownerEntry = this.db.get('packageOwnership').find({uuid: getuuid}).value();
        if (ownerEntry != undefined)
        {
            return ownerEntry.packages;
        }else {
            return [];
        }
    }
}

module.exports = Database;