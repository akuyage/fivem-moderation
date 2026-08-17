const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot) return;
        if (message.channel.id !== config.channels.icName) return;

        // Kullanıcının attığı ismi al
        const icName = message.content.trim();
        if (icName.length < 3 || icName.length > 32) return; // Geçersiz isimler

        // Orijinal mesajı silip kendi şık panelimizi atalım (opsiyonel ama daha temiz olur)
        // Ancak kullanıcı "altına emoji atacak" dediği için mesajı tutup buton eklemek daha mantıklı olabilir.
        // Ama Discord'da bir kullanıcının mesajına bot buton EKLEYEMEZ, sadece kendi mesajına ekleyebilir.
        // Bu yüzden mesajı silip bot mesajı olarak tekrar yayınlayacağız.

        try {
            await message.delete().catch(() => { });

            const avatar = message.author.displayAvatarURL({ dynamic: true });
            const embedColor = config.embed.color || '#2f3136';
            const colorInt = parseInt(embedColor.replace('#', ''), 16) || 0x2f3136;

            await message.channel.send({
                flags: (1 << 15), // IS_COMPONENTS_V2
                components: [
                    {
                        type: 17, // Container
                        accent_color: colorInt,
                        components: [
                            {
                                type: 9, // Section
                                components: [
                                    {
                                        type: 10,
                                        content: `# IC İsim Talebi\nKullanıcının karakter ismi onay bekliyor.`
                                    }
                                ],
                                accessory: {
                                    type: 11, // Thumbnail
                                    media: { url: avatar }
                                }
                            },
                            { type: 14 }, // Separator
                            {
                                type: 10,
                                content: `**Kullanıcı Bilgileri**\nKullanıcı: <@${message.author.id}>\nID: \`${message.author.id}\` (\`${message.author.tag}\`)`
                            },
                            { type: 14 }, // Separator
                            {
                                type: 10,
                                content: `**Talep Edilen İsim**\n\`\`\`ansi\n\u001b[1;36m${icName}\u001b[0m\n\`\`\``
                            },
                            { type: 14 }, // Separator
                            {
                                type: 1, // ActionRow
                                components: [
                                    {
                                        type: 2,
                                        custom_id: `icNameAccept_${message.author.id}_${icName}`,
                                        label: 'Onayla',
                                        style: 3
                                    },
                                    {
                                        type: 2,
                                        custom_id: `icNameReject_${message.author.id}`,
                                        label: 'Reddet',
                                        style: 4
                                    }
                                ]
                            },
                            { type: 14 }, // Separator
                            {
                                type: 10,
                                content: `-# Powered By akuyage`
                            }
                        ]
                    }
                ]
            }).catch(err => {
                console.error('[IC Isim] Panel gönderilemedi:', err);
            });

        } catch (error) {
            console.error('[IC Isim] Hata:', error);
        }
    }
};
