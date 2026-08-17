const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yetkilises')
        .setDescription('Yetkililerin seste olup olmadığını kontrol eden paneli gönderir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildIcon = interaction.guild.iconURL({ dynamic: true }) ?? interaction.client.user.displayAvatarURL();
        const staffRoleId = config.roles.staff;

        if (!staffRoleId) {
            return interaction.reply({ ...embeds.info(interaction.guild?.name || 'FiveM Moderation', 'Config dosyasında staff rolü ayarlanmamış.'), flags: (1 << 6) | (1 << 15) });
        }

        const staffRole = interaction.guild.roles.cache.get(staffRoleId);
        if (!staffRole) {
            return interaction.reply({ ...embeds.error(interaction.guild?.name || 'FiveM Moderation', 'Yetkili rolü sunucuda bulunamadı.'), flags: (1 << 6) | (1 << 15) });
        }

        let staffMembers = staffRole.members;
        if (!staffMembers || staffMembers.size === 0) {
            staffMembers = interaction.guild.members.cache.filter(m => m.roles.cache.has(staffRoleId));
        }
        
        if (!staffMembers || staffMembers.size === 0) {
            try {
                await interaction.guild.members.fetch({ force: false, withPresences: false });
                staffMembers = staffRole.members;
            } catch (e) {
                console.error('[yetkilises] members.fetch failed or was rate-limited:', e);
                staffMembers = new Map();
            }
        }

        const inVoice = [];
        const notInVoice = [];

        for (const [id, member] of staffMembers) {
            if (member.user.bot) continue;
            if (member.voice.channelId) inVoice.push(member);
            else notInVoice.push(member);
        }

        const inVoiceList = inVoice.map(m => `<@${m.id}> (\`${m.id}\`)`).join('\n') || 'Seste yetkili bulunmuyor.';
        const notInVoiceList = notInVoice.map(m => `<@${m.id}> (\`${m.id}\`)`).join('\n') || 'Seste olmayan yetkili bulunmuyor.';

        await interaction.reply({
            flags: (1 << 15),
            components: [
                {
                    type: 17, // Container
                    accent_color: 0x5865F2,
                    components: [
                        {
                            type: 9, // Section
                            components: [
                                {
                                    type: 10,
                                    content: `### Yetkili Ses Kontrolü\nSunucu içerisindeki yetkililerin anlık ses durumu aşağıda listelenmiştir.`
                                }
                            ],
                            accessory: {
                                type: 11,
                                media: { url: guildIcon }
                            }
                        },
                        { type: 14 },
                        {
                            type: 10,
                            content: `### Seste Olan Yetkililer (${inVoice.length})\n${inVoiceList}`
                        },
                        { type: 14 },
                        {
                            type: 10,
                            content: `### Seste Olmayan Yetkililer (${notInVoice.length})\n${notInVoiceList}`
                        },
                        { type: 14 },
                        {
                            type: 1, // ActionRow
                            components: [
                                {
                                    type: 2,
                                    custom_id: 'yetkilisescagir',
                                    label: 'Seste Olmayan Yetkilileri Sese Çağır',
                                    style: 3 // Success (Green)
                                }
                            ]
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
    }
};
