const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily-invite-log')
        .setDescription('Bulunduğunuz kanala anlık davet olaylarını gönderir (oluşturma, silme, kullanım).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guild = interaction.guild;
        if (!guild) return interaction.reply({ ...embeds.info(guild?.name || 'FiveM Moderation', 'Bu komut sunucu içerisinde kullanılmalıdır.'), flags: (1 << 6) | (1 << 15) });

        // GuildConfig'den mevcut kanal ID'sini oku
        db.prepare('INSERT OR IGNORE INTO GuildConfig (guildId) VALUES (?)').run(guild.id);
        const row = db.prepare('SELECT dailyInviteLogChannel FROM GuildConfig WHERE guildId = ?').get(guild.id);
        const existingChannelId = row?.dailyInviteLogChannel;

        // Eğer aynı kanala tekrar basıldıysa, kapat (toggle)
        if (existingChannelId === interaction.channel.id) {
            db.prepare('UPDATE GuildConfig SET dailyInviteLogChannel = NULL WHERE guildId = ?').run(guild.id);
            return interaction.reply({
                ...embeds.info(guild.name, '⛔ Günlük davet logu bu kanalda durduruldu.'),
                flags: (1 << 6) | (1 << 15)
            });
        }

        // Yeni kanalı SQLite'a kaydet
        db.prepare('UPDATE GuildConfig SET dailyInviteLogChannel = ? WHERE guildId = ?').run(interaction.channel.id, guild.id);

        return interaction.reply({
            ...embeds.success(guild.name, `✅ Bu kanala (<#${interaction.channel.id}>) anlık davet olayları gönderilecek. Bot yeniden başlatılsa bile bu ayar korunacaktır.`),
            flags: (1 << 6) | (1 << 15)
        });
    }
};
