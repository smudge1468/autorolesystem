const fs = require("fs");

module.exports = (client, OWNER_ID) => {

    const PREFIX = "oc!";
    const BLACKLIST_FILE = "./blacklist.json";

    // =========================================
    // CREATE FILE IF MISSING
    // =========================================

    if (!fs.existsSync(BLACKLIST_FILE)) {

        fs.writeFileSync(
            BLACKLIST_FILE,
            JSON.stringify([], null, 4)
        );

    }

    // =========================================
    // FUNCTIONS
    // =========================================

    function getBlacklist() {

        return JSON.parse(
            fs.readFileSync(BLACKLIST_FILE)
        );

    }

    function saveBlacklist(data) {

        fs.writeFileSync(
            BLACKLIST_FILE,
            JSON.stringify(data, null, 4)
        );

    }

    function addUser(userId) {

        const blacklist = getBlacklist();

        if (!blacklist.includes(userId)) {

            blacklist.push(userId);

            saveBlacklist(blacklist);

        }

    }

    function removeUser(userId) {

        let blacklist = getBlacklist();

        blacklist = blacklist.filter(
            id => id !== userId
        );

        saveBlacklist(blacklist);

    }

    // =========================================
    // ENFORCE BLACKLIST
    // =========================================

    async function enforceBlacklist() {

        const blacklist = getBlacklist();

        for (const guild of client.guilds.cache.values()) {

            for (const userId of blacklist) {

                try {

                    await guild.members.ban(userId, {
                        reason: "Centralised blacklist"
                    });

                    console.log(
                        `[BLACKLIST] Banned ${userId} in ${guild.name}`
                    );

                } catch (err) {}

            }

        }

    }

    // =========================================
    // READY EVENT
    // =========================================

    client.once("ready", async () => {

        console.log(
            "[BLACKLIST] Enforcing blacklist..."
        );

        await enforceBlacklist();

    });

    // =========================================
    // NEW SERVER JOIN
    // =========================================

    client.on("guildCreate", async guild => {

        const blacklist = getBlacklist();

        for (const userId of blacklist) {

            try {

                await guild.members.ban(userId, {
                    reason: "Centralised blacklist"
                });

            } catch (err) {}

        }

    });

    // =========================================
    // COMMANDS
    // =========================================

    client.on("messageCreate", async message => {

        if (message.author.bot) return;

        // =====================================
        // GLOBAL BAN
        // =====================================

        if (message.content.startsWith(`${PREFIX}globalban`)) {

            if (message.author.id !== OWNER_ID) {

                return message.reply(
                    "You cannot use this command."
                );

            }

            const args = message.content.split(" ");

            const userId = args[1];

            const reason =
                args.slice(2).join(" ");

            if (!userId) {

                return message.reply(
                    "Usage: oc!globalban USER_ID REASON"
                );

            }

            if (!reason) {

                return message.reply(
                    "Please provide a reason."
                );

            }

            addUser(userId);

            // =================================
            // DM USER
            // =================================

            try {

                const user =
                    await client.users.fetch(userId);

                await user.send(
`You have been globally blacklisted from Octopus Group associated servers.

Moderator: ${message.author.tag}
Reason: ${reason}`
                );

            } catch (err) {}

            // =================================
            // GLOBAL BAN
            // =================================

            let success = 0;

            for (const guild of client.guilds.cache.values()) {

                try {

                    await guild.members.ban(userId, {
                        reason:
`Global Blacklist | By: ${message.author.tag} | Reason: ${reason}`
                    });

                    success++;

                } catch (err) {}

            }

            return message.reply(
                `Globally banned ${userId} in ${success} servers.`
            );

        }

        // =====================================
        // GLOBAL UNBAN
        // =====================================

        if (message.content.startsWith(`${PREFIX}globalunban`)) {

            if (message.author.id !== OWNER_ID) {

                return message.reply(
                    "You cannot use this command."
                );

            }

            const args = message.content.split(" ");

            const userId = args[1];

            if (!userId) {

                return message.reply(
                    "Usage: oc!globalunban USER_ID"
                );

            }

            removeUser(userId);

            let success = 0;

            for (const guild of client.guilds.cache.values()) {

                try {

                    await guild.members.unban(userId);

                    success++;

                } catch (err) {}

            }

            return message.reply(
                `Globally unbanned ${userId} in ${success} servers.`
            );

        }

    });

    // =========================================
    // EXPORT
    // =========================================

    return {

        isBlacklisted(userId) {

            return getBlacklist().includes(userId);

        }

    };

};
