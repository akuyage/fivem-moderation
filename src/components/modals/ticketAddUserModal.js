const { PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
    data: { name: 'ticketAddUserModal' },
    async execute(interaction) {
        const userId = interaction.fields.getTextInputValue('userId').trim();

        let member;
        try {
            member = await interaction.guild.members.fetch(userId);
        } catch (e) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', `Kullanıcı bulunamadı. Lütfen geçerli bir ID girin.`), flags: (1 << 6) | (1 << 15) });
        }

        if (!member) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Kullanıcı bu sunucuda bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }

        try {
            await interaction.channel.permissionOverwrites.edit(member.id, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });

            const addComponents = [
                {
                    type: 10,
                    content: `# Kullanıcı Eklendi\n<@${member.id}> başarıyla bilet kanalına eklendi.`
                }
            ];

            return interaction.reply({ 
                flags: (1 << 15),
                components: [{ type: 17, accent_color: 0x5865F2, components: addComponents }]
            });
        } catch (err) {
            console.error('[Ticket] Kullanıcı eklenirken hata:', err);
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Kullanıcı eklenirken bir hata oluştu.'), flags: (1 << 6) | (1 << 15) });
        }
    }
};
