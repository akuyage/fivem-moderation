const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol-ver')
        .setDescription('Kullanıcıya rol verir.')
        .addUserOption(option => option.setName('kullanici').setDescription('Rol verilecek kişi').setRequired(true))
        .addRoleOption(option => option.setName('rol').setDescription('Verilecek rol').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        // Staff rolü kontrolü
        const staffRoleId = config.roles.staff;
        const isStaff = interaction.member.roles.cache.has(staffRoleId);
        
        // Admin veya Staff rolü gerekli
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles) && !isStaff) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Bu komutu kullanmak için Rol Yönet yetkisine veya Yetkili rolüne sahip olmanız gerekir!'), flags: (1 << 6) | (1 << 15) });
        }

        const targetUser = interaction.options.getUser('kullanici');
        const role = interaction.options.getRole('rol');

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (!targetMember) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Kullanıcı sunucuda bulunamadı!'), flags: (1 << 6) | (1 << 15) });
        }

        // Rol hiyerarşisi kontrolü
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Bu rolde benim yetkimden yüksek veya eşit bir pozisyonda olduğu için işlem yapamam.'), flags: (1 << 6) | (1 << 15) });
        }
        if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ ...embeds.error(interaction.guild.name, 'Kendi en yüksek rolünüzden daha üstün (veya eşit) bir rolü veremezsiniz.'), flags: (1 << 6) | (1 << 15) });
        }

        if (targetMember.roles.cache.has(role.id)) {
            return interaction.reply({ ...embeds.warn(interaction.guild.name, 'Kullanıcıda zaten bu rol var.'), flags: (1 << 6) | (1 << 15) });
        }

        await targetMember.roles.add(role, `Rol verildi - Sorumlu: ${interaction.user.tag} (${interaction.user.id})`);
        await interaction.reply({ ...embeds.success(interaction.guild.name, `${targetUser.tag} kullanıcısına <@&${role.id}> rolü verildi.`) });
    }
};
