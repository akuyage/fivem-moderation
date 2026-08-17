const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');
const config = require('../../../config.json');
const { parseDuration } = require('../../utils/punishTemplate');

const stmts = {
    insertGuildConfig: db.prepare('INSERT OR IGNORE INTO GuildConfig (guildId) VALUES (?)'),
    updateAutoPunish: db.prepare(`
        UPDATE GuildConfig 
        SET autoPunishType = ?, autoPunishDuration = ?
        WHERE guildId = ?
    `)
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('otoceza')
        .setDescription('3. uyarı puanına ulaşan kullanıcılara uygulanacak otomatik cezayı ayarlar.')
        .addStringOption(option =>
            option.setName('tip')
                .setDescription('Otomatik ceza türü')
                .setRequired(true)
                .addChoices(
                    { name: 'Süreli Uzaklaştırma', value: 'temp_ban' },
                    { name: 'Kalıcı Uzaklaştırma', value: 'perma_ban' }
                )
        )
        .addStringOption(option =>
            option.setName('sure')
                .setDescription('Süreli ceza için süre (Örn: 3d, 7d, 24h) — Kalıcı cezada boş bırakın')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Sadece developers listesindeki geliştiriciler kullanabilir
        const developers = config.developers || [];
        if (!developers.includes(interaction.user.id)) {
            return interaction.reply({
                ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Bu komutu sadece bot geliştiricileri (`config.developers`) kullanabilir.'),
                flags: (1 << 6) | (1 << 15)
            });
        }

        const type = interaction.options.getString('tip');
        const durationStr = interaction.options.getString('sure');

        let durationMs = 3 * 24 * 60 * 60 * 1000; // Varsayılan 3 gün
        let durationFormatted = '3 gün';

        if (type === 'temp_ban') {
            if (durationStr) {
                const parsed = parseDuration(durationStr);
                if (!parsed || parsed.ms <= 0) {
                    return interaction.reply({
                        ...embeds.error(interaction.guild.name, '❌ Geçersiz süre formatı! Örnek: `3d`, `7d`, `24h`, `3 gün`'),
                        flags: (1 << 6) | (1 << 15)
                    });
                }
                durationMs = parsed.ms;
                durationFormatted = parsed.formatted;
            }
        } else {
            durationFormatted = 'Kalıcı';
            durationMs = null;
        }

        const guildId = interaction.guild.id;

        // DB'ye Kaydet (INSERT OR IGNORE + UPDATE)
        stmts.insertGuildConfig.run(guildId);
        stmts.updateAutoPunish.run(type, durationMs, guildId);

        const typeLabel = type === 'temp_ban' ? `Süreli Uzaklaştırma (${durationFormatted})` : 'Kalıcı Uzaklaştırma';

        return interaction.reply({
            ...embeds.success(
                interaction.guild.name,
                `✅ **3. Uyarı Otomatik Ceza Ayarı Güncellendi**\n\n> **Yeni Ayar:** ${typeLabel}\n> Kullanıcılar 3. uyarı puanına ulaştığında bu ceza otomatik olarak uygulanacaktır.`
            ),
            flags: (1 << 6) | (1 << 15)
        });
    }
};

