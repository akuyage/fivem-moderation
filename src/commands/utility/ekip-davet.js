const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/connect');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ekip-davet')
        .setDescription('Bir kullanıcıyı ekibinize davet edersiniz.')
        .addUserOption(option => option.setName('kullanici').setDescription('Davet edilecek kullanıcı').setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('kullanici');
        
        if (targetUser.bot) return interaction.reply({ ...embeds.error(interaction.guild.name, 'Botları ekibe davet edemezsin.'), flags: (1 << 6) | (1 << 15) });
        if (targetUser.id === interaction.user.id) return interaction.reply({ ...embeds.error(interaction.guild.name, 'Kendini ekibe davet edemezsin.'), flags: (1 << 6) | (1 << 15) });

        const inviteChannelId = config.channels?.teamInviteChannel;
        if (interaction.channelId !== inviteChannelId) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, `Bu komutu sadece <#${inviteChannelId}> kanalında kullanabilirsin.`), flags: (1 << 6) | (1 << 15) });
        }

        const userTeam = db.prepare('SELECT * FROM Teams WHERE leaderId = ? OR ogId = ?').get(interaction.user.id, interaction.user.id);
        if (!userTeam) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Bir ekibe davet atabilmek için ekip **Boss** veya **OG**\'si olmalısın.'), flags: (1 << 6) | (1 << 15) });
        }

        const role = interaction.guild.roles.cache.get(userTeam.roleId);
        const memberCount = role ? role.members.size : 0;
        if (memberCount >= userTeam.memberLimit) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, `Ekip üye sınırına (${userTeam.memberLimit}) ulaştığı için yeni davet atamazsın.`), flags: (1 << 6) | (1 << 15) });
        }

        const currentTime = Math.floor(Date.now() / 1000);
        db.prepare('DELETE FROM TeamLocks WHERE lockedUntil <= ?').run(currentTime);

        const globalLock = db.prepare('SELECT * FROM TeamLocks WHERE userId = ? AND lockType = ?').get(targetUser.id, 'JOIN_LOCK');
        if (globalLock) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, `<@${targetUser.id}> isimli kullanıcı yakın zamanda bir ekibe girdiği/çıktığı için <t:${globalLock.lockedUntil}:R> davet alabilir.`), flags: (1 << 6) | (1 << 15) });
        }

        const rejectLock = db.prepare('SELECT * FROM TeamLocks WHERE userId = ? AND teamId = ? AND lockType = ?').get(targetUser.id, userTeam.id, 'REJECT_LOCK');
        if (rejectLock) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, `<@${targetUser.id}> isimli kullanıcı ekibinizin davetini yakın zamanda reddettiği için <t:${rejectLock.lockedUntil}:R> tekrar davet edilebilir.`), flags: (1 << 6) | (1 << 15) });
        }

        const guildIcon = interaction.guild.iconURL({ dynamic: true }) ?? interaction.client.user.displayAvatarURL();
        
        await interaction.channel.send({
            flags: (1 << 15),
            components: [{
                type: 17,
                accent_color: 0x5865F2,
                components: [
                    {
                        type: 9,
                        components: [{ type: 10, content: `### Ekip Daveti\n<@${interaction.user.id}>, <@${targetUser.id}> isimli kullanıcıyı **${userTeam.name}** ekibine davet ediyor.` }],
                        accessory: { type: 11, media: { url: guildIcon } }
                    },
                    { type: 14 },
                    {
                        type: 1,
                        components: [
                            { type: 2, custom_id: `teamInviteAccept_${userTeam.id}_${targetUser.id}`, label: 'Onayla', style: 3 },
                            { type: 2, custom_id: `teamInviteReject_${userTeam.id}_${targetUser.id}`, label: 'Reddet', style: 4 }
                        ]
                    }
                ]
            }]
        });

        return interaction.reply({ ...embeds.success(interaction.guild.name, `<@${targetUser.id}> isimli kullanıcıya başarıyla davet gönderildi.`), flags: (1 << 6) | (1 << 15) });
    }
};
