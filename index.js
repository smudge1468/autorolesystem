const blacklistSystem = require("./blacklist")(client, "1134029206452457483");

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
const CHANNEL_ID = "1502028893522104410";
// ==========================================

if (!TOKEN) {
    console.error("No TOKEN environment variable found.");
    process.exit(1);
}

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    try {
        // Ignore normal bot messages but allow webhooks
        if (message.author.bot && !message.webhookId) return;

        // Only monitor your webhook channel
        if (message.channel.id !== CHANNEL_ID) return;

        /*
            Expected format:

            USERNAME(USERID) ROLEID1,ROLEID2,ROLEID3

            Example:
            Albie(123456789012345678) 111111111111111111,222222222222222222
        */

        const regex = /^(.+?)\((\d+)\)\s+(.+)$/;
        const match = message.content.match(regex);

        if (!match) {
            console.log("Invalid message format.");
            return;
        }

        const username = match[1].trim();
        const userId = match[2].trim();

        const roleIds = match[3]
            .split(",")
            .map(role => role.trim())
            .filter(role => role.length > 0);

        if (roleIds.length === 0) {
            console.log("No roles supplied.");
            return;
        }

        const guild = message.guild;

        if (!guild) {
            console.log("No guild found.");
            return;
        }

        // Ensure bot has permissions
        if (
            !guild.members.me.permissions.has(
                PermissionsBitField.Flags.ManageRoles
            )
        ) {
            console.log("Bot missing Manage Roles permission.");
            return;
        }

        let member = null;

        // ===============================
        // TRY FINDING USER BY ID FIRST
        // ===============================

        member = await guild.members
            .fetch(userId)
            .catch(() => null);

        // ===============================
        // FALLBACK TO USERNAME SEARCH
        // ===============================

        if (!member) {
            console.log(
                `User ID failed (${userId}), attempting username lookup...`
            );

            // Cache all members
            await guild.members.fetch();

            member = guild.members.cache.find(m => {
                return (
                    m.user.username.toLowerCase() ===
                        username.toLowerCase() ||

                    (m.user.globalName &&
                        m.user.globalName.toLowerCase() ===
                            username.toLowerCase()) ||

                    m.displayName.toLowerCase() ===
                        username.toLowerCase()
                );
            });
        }

        // ===============================
        // USER NOT FOUND
        // ===============================

        if (!member) {
            console.log(
                `Could not find user via ID or username: ${username}`
            );
            return;
        }

        console.log(
            `Found member: ${member.user.tag}`
        );

        // ===============================
        // ASSIGN ROLES
        // ===============================

        for (const roleId of roleIds) {
            const role = guild.roles.cache.get(roleId);

            if (!role) {
                console.log(`Role not found: ${roleId}`);
                continue;
            }

            // Check role hierarchy
            if (
                role.position >=
                guild.members.me.roles.highest.position
            ) {
                console.log(
                    `Cannot assign ${role.name} - role above bot`
                );
                continue;
            }

            // Skip if user already has role
            if (member.roles.cache.has(roleId)) {
                console.log(
                    `${member.user.tag} already has ${role.name}`
                );
                continue;
            }

            try {
                await member.roles.add(roleId);

                console.log(
                    `Assigned ${role.name} to ${member.user.tag}`
                );
            } catch (err) {
                console.log(
                    `Failed to assign ${role.name}:`,
                    err
                );
            }
        }

    } catch (error) {
        console.error("Main handler error:", error);
    }
});

client.login(TOKEN);
