const embeds = require('../../utils/embeds');
const config = require('../../../config.json');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'acceptStaff' },
    async execute(interaction) {
        // 1. Buton tıklayan kişinin yetkisini kontrol et
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
            !interaction.member.roles.cache.has(config.roles.staff)) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Bu işlem için Admin veya Yetkili rolüne sahip olmanız gerekir!'), flags: (1 << 6) | (1 << 15) });
        }

        const userId = interaction.customId.split('_')[1];
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        
        if (!member) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Kullanıcı sunucudan ayrılmış.'), flags: (1 << 6) | (1 << 15) });
        }

        // Mesajı güncelle - Components V2 ile onay göster
        await interaction.update({
            flags: (1 << 15),
            components: [
                {
                    type: 17, // Container
                    accent_color: 0x43b581, // Yeşil
                    components: [
                        {
                            type: 9, // Section
                            components: [
                                {
                                    type: 10,
                                    content: `# Başvuru Onaylandı\n<@${userId}> kullanıcısının yetkili başvurusu onaylandı.`
                                }
                            ],
                            accessory: {
                                type: 11, // Thumbnail
                                media: { url: member.user.displayAvatarURL({ dynamic: true }) }
                            }
                        },
                        { type: 14 },
                        {
                            type: 10,
                            content: `-# Powered By akuyage`
                        }
                    ]
                }
            ]
        });

        // DM gönder (çekiliş/dmduyuru stilinde)
        const row = {
            type: 1,
            components: [
                {
                    type: 2,
                    custom_id: 'dm_sender_info',
                    label: `${interaction.user.username} - ${interaction.user.id}`,
                    style: 2,
                    disabled: true
                },
                {
                    type: 2,
                    label: interaction.guild.name,
                    style: 5,
                    url: `https://discord.com/channels/${interaction.guild.id}`
                }
            ]
        };

        await member.send({
            content: `**Başvurunuz onaylandı!**\n\nTebrikler! **${interaction.guild.name}** sunucusundaki yetkili başvurunuz onaylandı. Gelişmelerden haberdar olmak için alttaki butonlar ile sunucuya dönebilirsiniz.`,
            components: [row]
        }).catch(() => {});
    }
};
