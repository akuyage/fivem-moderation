const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

module.exports = (client) => {
    client.buttons = new Collection();
    client.selectMenus = new Collection();
    client.modals = new Collection();

    const componentsPath = path.join(__dirname, '..', 'components');
    if (!fs.existsSync(componentsPath)) return;

    const componentFolders = fs.readdirSync(componentsPath);

    for (const folder of componentFolders) {
        const folderPath = path.join(componentsPath, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const componentFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        
        for (const file of componentFiles) {
            const filePath = path.join(folderPath, file);
            const component = require(filePath);
            
            switch (folder) {
                case 'buttons':
                    client.buttons.set(component.data.name, component);
                    break;
                case 'selectMenus':
                    client.selectMenus.set(component.data.name, component);
                    break;
                case 'modals':
                    client.modals.set(component.data.name, component);
                    break;
            }
        }
    }

    console.log(`[Handler] ${client.buttons.size} Buton, ${client.selectMenus.size} Menü, ${client.modals.size} Modal yüklendi.`);
};
