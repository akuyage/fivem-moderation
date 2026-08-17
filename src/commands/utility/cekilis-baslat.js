const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');
const db = require('../../database/connect');

function parseTime(timeStr) {
    const regex = /(\d+)(s|m|h|d)/i;
    const match = timeStr.match(regex);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    let multiplier = 1000;
    if (unit === 'm') multiplier = 1000 * 60;
    if (unit === 'h') multiplier = 1000 * 60 * 60;
    if (unit === 'd') multiplier = 1000 * 60 * 60 * 24;

    return value * multiplier;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cekilis-baslat')
        .setDescription('Yeni bir çekiliş başlatır.')
        .addStringOption(option =>
            option.setName('sure')
                .setDescription('Çekiliş süresi (Örn: 10m, 1h, 2d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('odul')
                .setDescription('Çekiliş ödülü')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('kazanan_sayisi')
                .setDescription('Kaç kişi kazanacak?')
                .setMinValue(1)
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Çekilişin yapılacağı kanal (Boş bırakılırsa mevcut kanal)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('resim')
                .setDescription('Çekiliş görseli URL (İsteğe bağlı)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sureStr = interaction.options.getString('sure');
        const odul = interaction.options.getString('odul');
        const kazananSayisi = interaction.options.getInteger('kazanan_sayisi');
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;
        const resim = interaction.options.getString('resim');

        const durationMs = parseTime(sureStr);
        if (!durationMs) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Geçersiz süre formatı! Lütfen \`10m\`, \`1h\`, \`2d\` gibi bir değer girin.'), flags: (1 << 6) | (1 << 15) });
        }

        const endTime = Date.now() + durationMs;
        const endTimestamp = Math.floor(endTime / 1000);

        const containerComponents = [
            {
                type: 10, // TextDisplay
                content: `### ÇEKİLİŞ BAŞLADI\n\n**Ödül:** \`${odul}\`\n**Kazanan Sayısı:** \`${kazananSayisi}\`\n\n**Bitiş Zamanı:** <t:${endTimestamp}:R> (<t:${endTimestamp}:f>)\n**Başlatan:** <@${interaction.user.id}>\n\nKatılmak için aşağıdaki butona tıklayın.`
            },
            { type: 14 } // Separator
        ];

        if (resim && (resim.startsWith('http://') || resim.startsWith('https://'))) {
            containerComponents.splice(1, 0, {
                type: 12, // MediaGallery
                items: [{ media: { url: resim } }]
            });
        }

        const actionRow = {
            type: 1,
            components: [
                {
                    type: 2,
                    custom_id: 'giveawayJoin',
                    label: 'Çekilişe Katıl',
                    style: ButtonStyle.Success
                },
                {
                    type: 2,
                    custom_id: 'giveawayLeave',
                    label: 'Çekilişten Ayrıl',
                    style: ButtonStyle.Danger
                }
            ]
        };

        containerComponents.push(actionRow);
        containerComponents.push({ type: 14 });
        containerComponents.push({
            type: 10,
            content: `-# Powered By akuyage`
        });

        await interaction.deferReply({ flags: (1 << 6) | (1 << 15) });

        try {
            const message = await kanal.send({
                flags: (1 << 15),
                components: [
                    {
                        type: 17, // Container
                        accent_color: 0x5865F2,
                        components: containerComponents
                    }
                ]
            });

            db.prepare(`
                INSERT INTO Giveaways (messageId, channelId, guildId, prize, winnersCount, endTime, hostId, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
            `).run(message.id, kanal.id, interaction.guild.id, odul, kazananSayisi, endTime, interaction.user.id);

            return interaction.editReply(embeds.success(interaction.guild?.name || 'FiveM Moderation', `✅ Çekiliş başarıyla ${kanal} kanalında başlatıldı.`));
        } catch (error) {
            console.error(error);
            return interaction.editReply(embeds.error(interaction.guild?.name || 'FiveM Moderation', '❌ Çekiliş başlatılırken bir hata oluştu.'));
        }
    }
};
