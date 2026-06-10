const fs = require("fs");

module.exports = (client, OWNER_ID) => {

    const PREFIX = "oc!";
    const BLACKLIST_FILE = "./blacklist.json";

    if (!fs.existsSync(BLACKLIST_FILE)) {
        fs.writeFileSync(BLACKLIST_FILE, JSON.stringify([], null, 4));
    }

    function getBlacklist() {
        return JSON.parse(fs.readFileSync(BLACKLIST_FILE));
    }

    function saveBlacklist(data) {
        fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(data, null, 4));
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
        blacklist = blacklist.filter(id => id !== userId);
        saveBlacklist(blacklist);
    }

    async function enforceBlacklist() {
        const blacklist = getBlacklist();

        for (const guild of client.guilds.cache.values()) {
            for (const userId of blacklist) {
                try {
                    await guild.members.ban(userId, {
                        reason: "Centralised blacklist"
                    });

                    console.log(`[BLACKLIST] Banned ${userId} in ${guild.name}`);
                } catch (err) {}
            }
        }
    }

    client.once("ready", async () => {
        console.log("[BLACKLIST] Enforcing blacklist...");
        await enforceBlacklist();
    });

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

    client.on("messageCreate", async message => {

        if (message.author.bot) return;

        // GLOBAL BAN
        if (message.content.startsWith(`${PREFIX}globalban`)) {

            if (message.author.id !== OWNER_ID) {
                return message.reply("You cannot use this command.");
            }

            const args = message.content.split(" ");
            const userId = args[1];
            const reason = args.slice(2).join(" ");

            if (!userId) {
                return message.reply("Usage: oc!globalban USER_ID REASON");
            }

            if (!reason) {
                return message.reply("Please provide a reason.");
            }

            addUser(userId);

            try {
                const user = await client.users.fetch(userId);

                await user.send(
`You have been globally blacklisted from Octopus Group associated servers.

Moderator: ${message.author.tag}
Reason: ${reason}`
                );
            } catch (err) {}

            let success = 0;

            for (const guild of client.guilds.cache.values()) {
                try {
                    await guild.members.ban(userId, {
                        reason: `Global Blacklist | By: ${message.author.tag} | Reason: ${reason}`
                    });

                    success++;
                } catch (err) {}
            }

            return message.reply(
                `Globally banned ${userId} in ${success} servers.`
            );
        }

        // GLOBAL UNBAN
        if (message.content.startsWith(`${PREFIX}globalunban`)) {

            if (message.author.id !== OWNER_ID) {
                return message.reply("You cannot use this command.");
            }

            const args = message.content.split(" ");
            const userId = args[1];

            if (!userId) {
                return message.reply("Usage: oc!globalunban USER_ID");
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

        // TERMINATE USER
        if (message.content.startsWith(`${PREFIX}terminate`)) {

            if (
                message.author.id !== OWNER_ID &&
                !(
                    message.author.id === "884453546450374678" &&
                    message.guild?.id === "1510584039218610317"
                )
            ) {
                return message.reply("You cannot use this command.");
            }

            const args = message.content.split(" ");
            const userId = args[1];
            const reason = args.slice(2).join(" ");

            if (!userId) {
                return message.reply("Usage: oc!terminate USER_ID REASON");
            }

            if (!reason) {
                return message.reply("Please provide a reason.");
            }

            const guild = message.guild;

            if (!guild) {
                return message.reply("This command can only be used in a server.");
            }

            const KEEP_ROLES = [
                "1500198344763641997",
                "1502006799614869545",
                "1510585658455097394"
            ];

            const member = await guild.members
                .fetch(userId)
                .catch(() => null);

            if (!member) {
                return message.reply("Could not find that user in this server.");
            }

            try {
                await member.send(
`You have been terminated from ${guild.name}.

Moderator: ${message.author.tag}
Reason: ${reason}`
                );
            } catch (err) {
                console.log(`[TERMINATE] Could not DM ${userId}`);
            }

            const rolesToRemove = member.roles.cache.filter(role =>
                role.id !== guild.id &&
                !KEEP_ROLES.includes(role.id) &&
                role.position < guild.members.me.roles.highest.position
            );

            try {
                await member.roles.remove(
                    rolesToRemove,
                    `Terminated by ${message.author.tag} | Reason: ${reason}`
                );

                return message.reply(
                    `Terminated ${member.user.tag}. Removed ${rolesToRemove.size} roles.`
                );
            } catch (err) {
                console.error(err);
                return message.reply("Failed to remove roles.");
            }
        }
    });

    return {
        isBlacklisted(userId) {
            return getBlacklist().includes(userId);
        }
    };
};
