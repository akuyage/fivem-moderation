const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    data: { name: 'staffApplication' },
    async execute(interaction) {
        const nameAge = interaction.fields.getTextInputValue('nameAge');
        const activeTime = interaction.fields.getTextInputValue('activeTime');
        const reason = interaction.fields.getTextInputValue('reason');

        // Başvuruyu log kanalına gönder
        const logChannelId = config.channels?.yetkiliBasvuruLogChannel;
        if (!logChannelId) {
            return interaction.reply({ content: 'Sistem hatası: Başvuru log kanalı (yetkiliBasvuruLogChannel) config dosyasında ayarlanmamış.', flags: (1 << 6) });
        }

        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (!logChannel) {
            return interaction.reply({ content: 'Sistem hatası: Başvuru log kanalı bulunamadı.', flags: (1 << 6) });
        }

        const avatar = interaction.user.displayAvatarURL({ dynamic: true });

        await logChannel.send({
            flags: (1 << 15), // IS_COMPONENTS_V2
            components: [
                // Container - Ana çerçeve
                {
                    type: 17, // Container
                    accent_color: 0x5865F2,
                    components: [
                        // Başlık + Avatar
                        {
                            type: 9, // Section
                            components: [
                                {
                                    type: 10, // TextDisplay
                                    content: `# Yeni Yetkili Başvurusu\n<@${interaction.user.id}> yetkili olmak için başvurdu!`
                                }
                            ],
                            accessory: {
                                type: 11, // Thumbnail
                                media: { url: avatar }
                            }
                        },
                        { type: 14 }, // Separator
                        // Başvuran Bilgileri
                        {
                            type: 10, // TextDisplay
                            content: `### Başvuran Bilgileri\n> **Kullanıcı:** <@${interaction.user.id}>\n> **ID:** \`${interaction.user.id}\`\n> **Hesap Oluşturma:** <t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>`
                        },
                        { type: 14 }, // Separator
                        // Form Yanıtları
                        {
                            type: 10, // TextDisplay
                            content: `### Form Yanıtları\n**1. İsim ve Yaş:**\n\`\`\`text\n${nameAge}\n\`\`\`\n**2. Günlük Aktiflik:**\n\`\`\`text\n${activeTime}\n\`\`\`\n**3. Neden Biz?**\n\`\`\`text\n${reason}\n\`\`\``
                        },
                        { type: 14 }, // Separator
                        // Onayla / Reddet Butonları yan yana
                        {
                            type: 1, // ActionRow
                            components: [
                                {
                                    type: 2, // Button
                                    custom_id: `acceptStaff_${interaction.user.id}`,
                                    label: 'Onayla',
                                    style: 3 // Success
                                },
                                {
                                    type: 2, // Button
                                    custom_id: `rejectStaff_${interaction.user.id}`,
                                    label: 'Reddet',
                                    style: 4 // Danger
                                }
                            ]
                        },
                        {
                            type: 10,
                            content: `Powered By akuyage`
                        }
                    ]
                }
            ]
        });

        await interaction.reply({ content: 'Başvurunuz başarıyla sistemimize iletildi. Yetkililerimiz en kısa sürede değerlendirecektir!', flags: (1 << 6) });
    }
};
