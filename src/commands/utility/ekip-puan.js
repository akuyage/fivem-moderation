const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/connect');
const embeds = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ekip-puan')
        .setDescription('Bir ekibin puanını yönetir (Ekle/Sil).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ekle')
                .setDescription('Bir ekibe puan ekler.')
                .addIntegerOption(option => 
                    option.setName('id')
                        .setDescription('Ekip ID\'si')
                        .setRequired(true))
                .addIntegerOption(option => 
                    option.setName('puan')
                        .setDescription('Eklenecek puan miktarı')
                        .setRequired(true)
                        .setMinValue(1))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sil')
                .setDescription('Bir ekipten puan siler.')
                .addIntegerOption(option => 
                    option.setName('id')
                        .setDescription('Ekip ID\'si')
                        .setRequired(true))
                .addIntegerOption(option => 
                    option.setName('puan')
                        .setDescription('Silinecek puan miktarı')
                        .setRequired(true)
                        .setMinValue(1))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const teamId = interaction.options.getInteger('id');
        const points = interaction.options.getInteger('puan');

        await interaction.deferReply();

        const team = db.prepare('SELECT * FROM Teams WHERE id = ?').get(teamId);
        
        if (!team) {
            return interaction.editReply({ ...embeds.error(interaction.guild.name, 'Bu ID\'ye sahip bir ekip bulunamadı.') });
        }

        let newPoints = team.points;

        if (subcommand === 'ekle') {
            newPoints += points;
            db.prepare('UPDATE Teams SET points = ? WHERE id = ?').run(newPoints, teamId);
            return interaction.editReply({ ...embeds.success(interaction.guild.name, `**${team.name}** ekibine başarıyla **${points}** puan eklendi.\n> Yeni Puan: **${newPoints}**`) });
        } 
        else if (subcommand === 'sil') {
            newPoints -= points;
            if (newPoints < 0) newPoints = 0; // Puanın eksiye düşmesini engelle
            db.prepare('UPDATE Teams SET points = ? WHERE id = ?').run(newPoints, teamId);
            return interaction.editReply({ ...embeds.success(interaction.guild.name, `**${team.name}** ekibinden başarıyla **${points}** puan silindi.\n> Yeni Puan: **${newPoints}**`) });
        }
    }
};
