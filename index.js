const {
    Client,
    GatewayIntentBits,
    PermissionsBitField
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================= CONFIG =================

const TOKEN = process.env.TOKEN;
const ALLOWED_CHANNELS = [
    "1502028893522104410", // Original server
    "1502008723667681392"  // Second server
];
const OWNER_ID = "1134029206452457483";

// ==========================================

if (!TOKEN) {
    console.error("TOKEN missing.");
    process.exit(1);
}

// ==========================================
// BLACKLIST SYSTEM
// ==========================================

const blacklistSystem = require("./blacklist")(
    client,
    OWNER_ID
);

// ==========================================
// READY
// ==========================================

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ==========================================
// AUTO ROLE SYSTEM
// ==========================================

client.on("messageCreate", async message => {

    try {

        // Ignore normal bots but allow webhooks
        if (message.author.bot && !message.webhookId)
            return;

        // Only webhook channel
       if (!ALLOWED_CHANNELS.includes(message.channel.id))
    return;

        /*
            FORMAT:

            USERNAME(USERID) ROLE1,ROLE2

            Example:
            Albie(123456789) 111111,222222
        */

        const regex =
            /^(.+?)\((\d+)\)\s+(.+)$/;

        const match =
            message.content.match(regex);

        if (!match) {
            console.log(
                "Invalid webhook format."
            );
            return;
        }

        const username =
            match[1].trim();

        const userId =
            match[2].trim();

        const roleIds = match[3]
            .split(",")
            .map(r => r.trim())
            .filter(r => r.length > 0);

        // ==================================
        // BLACKLIST CHECK
        // ==================================

        if (
            blacklistSystem.isBlacklisted(
                userId
            )
        ) {
            console.log(
                `Blocked blacklisted user ${userId}`
            );

            return;
        }

        const guild = message.guild;

        if (!guild) return;

        // ==================================
        // PERMISSIONS
        // ==================================

        if (
            !guild.members.me.permissions.has(
                PermissionsBitField.Flags
                    .ManageRoles
            )
        ) {
            console.log(
                "Missing ManageRoles permission."
            );

            return;
        }

        let member = null;

        // ==================================
        // FIND BY ID
        // ==================================

        member = await guild.members
            .fetch(userId)
            .catch(() => null);

        // ==================================
        // FALLBACK USERNAME SEARCH
        // ==================================

        if (!member) {

            await guild.members.fetch();

            member =
                guild.members.cache.find(m => {

                    return (
                        m.user.username.toLowerCase() ===
                            username.toLowerCase() ||

                        m.displayName.toLowerCase() ===
                            username.toLowerCase() ||

                        (m.user.globalName &&
                            m.user.globalName.toLowerCase() ===
                                username.toLowerCase())
                    );

                });

        }

        if (!member) {

            console.log(
                `Could not find user ${username}`
            );

            return;
        }

        // ==================================
        // ASSIGN ROLES
        // ==================================

        for (const roleId of roleIds) {

            const role =
                guild.roles.cache.get(roleId);

            if (!role) {
                console.log(
                    `Role not found ${roleId}`
                );
                continue;
            }

            // hierarchy check
            if (
                role.position >=
                guild.members.me.roles.highest
                    .position
            ) {
                console.log(
                    `Cannot assign ${role.name}`
                );
                continue;
            }

            // already has role
            if (
                member.roles.cache.has(roleId)
            ) {
                continue;
            }

            try {

                await member.roles.add(role);

                console.log(
                    `Assigned ${role.name} to ${member.user.tag}`
                );

            } catch (err) {

                console.log(
                    `Failed assigning ${role.name}`
                );

            }

        }

    } catch (err) {

        console.error(
            "Main message handler crash:",
            err
        );

    }

});

// ==========================================
// PREVENT CRASHES
// ==========================================

process.on(
    "unhandledRejection",
    console.error
);

process.on(
    "uncaughtException",
    console.error
);

// ==========================================
// LOGIN
// ==========================================

client.login(TOKEN);
