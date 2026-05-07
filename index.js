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
const CHANNEL_ID = "1502028893522104410";
const TOKEN = process.env.TOKEN;
// ==========================================

if (!TOKEN) {
    console.error("No bot token found in environment variables.");
    process.exit(1);
}

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
    try {
        // Ignore bots/webhooks check optional
        if (message.author.bot && !message.webhookId) return;

        // Only monitor the specified channel
        if (message.channel.id !== CHANNEL_ID) return;

        /*
            Expected format:
            DISCORDUSERNAME(DISCORDUSERID) ROLEID1,ROLEID2,ROLEID3

            Example:
            Albie(123456789012345678) 111111111111111111,222222222222222222
        */

        const regex = /\((\d+)\)\s+(.+)/;
        const match = message.content.match(regex);

        if (!match) {
            console.log("Invalid message format.");
            return;
        }

        const userId = match[1];

        const roleIds = match[2]
            .split(",")
            .map(role => role.trim())
            .filter(role => role.length > 0);

        if (roleIds.length === 0) {
            console.log("No roles provided.");
            return;
        }

        const guild = message.guild;
        if (!guild) return;

        const member = await guild.members.fetch(userId).catch(() => null);

        if (!member) {
            console.log(`Could not find member: ${userId}`);
            return;
        }

        // Ensure bot can manage roles
        if (
            !guild.members.me.permissions.has(
                PermissionsBitField.Flags.ManageRoles
            )
        ) {
            console.log("Bot lacks Manage Roles permission.");
            return;
        }

        for (const roleId of roleIds) {
            const role = guild.roles.cache.get(roleId);

            if (!role) {
                console.log(`Role not found: ${roleId}`);
                continue;
            }

            // Prevent assigning higher roles
            if (
                role.position >=
                guild.members.me.roles.highest.position
            ) {
                console.log(
                    `Cannot assign ${role.name} - role higher than bot`
                );
                continue;
            }

            if (!member.roles.cache.has(roleId)) {
                await member.roles.add(roleId);

                console.log(
                    `Assigned ${role.name} to ${member.user.tag}`
                );
            }
        }
    } catch (error) {
        console.error("Error processing message:", error);
    }
});

client.login(TOKEN);
