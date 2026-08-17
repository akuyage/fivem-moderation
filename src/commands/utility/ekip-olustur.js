const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

function getNextTeamId() {
    const ids = db.prepare('SELECT id FROM Teams ORDER BY id ASC').all().map(r => r.id);
    let nextId = 1;
    for (const id of ids) {
        if (id !== nextId) break;
        nextId++;
    }
    return nextId;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ekip-olustur')
        .setDescription('Yeni bir ekip oluşturur (Otomatik rol açar).')
        .addStringOption(option => option.setName('isim').setDescription('Ekip ismi').setRequired(true))
        .addIntegerOption(option => option.setName('limit').setDescription('Üye sınırı').setRequired(true))
        .addUserOption(option => option.setName('boss').setDescription('Ekip bossu').setRequired(true))
        .addUserOption(option => option.setName('og').setDescription('Ekip OG\'si').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const teamName = interaction.options.getString('isim');
        const memberLimit = interaction.options.getInteger('limit');
        const bossUser = interaction.options.getUser('boss');
        const ogUser = interaction.options.getUser('og');
        const config = require('../../../config.json');

        await interaction.deferReply();

        const existing = db.prepare('SELECT * FROM Teams WHERE name = ?').get(teamName);
        if (existing) {
            return interaction.editReply({ ...embeds.error(interaction.guild.name, 'Bu isimde bir ekip zaten mevcut.') });
        }

        try {
            const role = await interaction.guild.roles.create({
                name: teamName,
                reason: `Ekip oluşturuldu - Sorumlu: ${interaction.user.tag}`
            });

            const bossMember = await interaction.guild.members.fetch(bossUser.id).catch(() => null);
            if (bossMember) await bossMember.roles.add(role.id).catch(() => {});

            if (ogUser) {
                const ogMember = await interaction.guild.members.fetch(ogUser.id).catch(() => null);
                if (ogMember) await ogMember.roles.add(role.id).catch(() => {});
            }

            const categoryId = config.channels.teamCategory;
            let channel;
            channel = await interaction.guild.channels.create({
                name: `${teamName}-sınırsız`,
                type: 0,
                parent: categoryId || null,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    { id: config.roles.staff, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                ],
            });

            const teamId = getNextTeamId();

            db.prepare('INSERT INTO Teams (id, name, roleId, channelId, leaderId, ogId, memberLimit) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                teamId, teamName, role.id, channel ? channel.id : null, bossUser.id, ogUser ? ogUser.id : null, memberLimit
            );

            if (channel) {
                const panelMessage = await channel.send({
                    flags: (1 << 15),
                    components: [
                        {
                            type: 17,
                            accent_color: 0x5865F2,
                            components: [
                                {
                                    type: 9,
                                    components: [{ type: 10, content: `# ${teamName} Yönetim Paneli\nEkibin başarıyla kuruldu!` }],
                                    accessory: { type: 11, media: { url: interaction.guild.iconURL({ dynamic: true }) || '' } }
                                },
                                { type: 14 },
                                { type: 10, content: `### Ekip ID:\n${teamId}` },
                                { type: 10, content: `### Ekip Bossu:\n<@${bossUser.id}>` },
                                { type: 10, content: `### Üye Sınırı:\n${memberLimit}` },
                                { type: 14 },
                                {
                                    type: 1,
                                    components: [{
                                        type: 5,
                                        custom_id: `teamAddMember_${teamId}`,
                                        placeholder: 'Üye ekle...',
                                        min_values: 1,
                                        max_values: 1
                                    }]
                                },
                                {
                                    type: 1,
                                    components: [
                                        { type: 2, custom_id: `teamChangeBoss_${teamId}`, label: 'Boss Değiştir', style: 2 },
                                        { type: 2, custom_id: `teamChangeOG_${teamId}`, label: 'OG Değiştir', style: 2 },
                                        { type: 2, custom_id: `teamInfo_${teamId}`, label: 'Ekip Bilgisi', style: 2 },
                                        { type: 2, custom_id: `teamRemoveMember_${teamId}`, label: 'Üye Çıkart', style: 4 }
                                    ]
                                }
                            ]
                        }
                    ]
                });
                if (panelMessage) await panelMessage.pin().catch(() => {});
            }

            return interaction.editReply({
                flags: (1 << 15),
                components: [{
                    type: 17,
                    accent_color: 0x43b581,
                    components: [
                        { type: 10, content: `# Ekip Oluşturuldu` },
                        { type: 14 },
                        { type: 10, content: `> **Ekip:** ${teamName}\n> **ID:** ${teamId}\n> **Boss:** <@${bossUser.id}>` }
                    ]
                }]
            });
        } catch (err) {
            console.error(err);
            return interaction.editReply({ ...embeds.error(interaction.guild.name, 'Ekip oluşturulurken bir hata oluştu.') });
        }
    }
};
