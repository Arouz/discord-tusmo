const Discord = require('discord.js');
const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const client = new Discord.Client({intents: 513});
const token = "OTc4ODU0MjQzNjg1NTE1MzA0.G4Goay.CUnebXGO6cn3220uj_Rk1DCde4B1etbGU1708k";

// games data storage
const gameStorage = {deleteKey(key) {delete gameStorage[key]}};

client.once('ready', () => {
    console.log("RUNNING");
});
client.login(token);

 
client.on('messageCreate', function (message) {

    if (gameStorage.hasOwnProperty(message.channel.id)) {

        const GAME = gameStorage[message.channel.id];

        // Answer management - Only if the message author is in the game
        if (GAME.answers !== null && GAME.players.hasOwnProperty(message.author.username)) {

            
        }

        /**
         * Commands management
         */

        // purge the channel
        if (message.content === '!purge') { 
            GAME.purgeChannel();
        }
    }

    if (message.content === '!game') {
        createGameAndMessage(message.channel);
    }

})

function createGameAndMessage(channel) {
    const GAME = newGameInstance(channel);
    // Create the message with the interactive buttons
    const rows = createAlphabetWithButtons(); 

        
    const exampleEmbed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('A-TUSMO')
            .setAuthor({ name: 'Arouzmist', iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
            .setDescription('Cet embed comportera le nouveau jeu')
            .setThumbnail('https://i.imgur.com/AfFp7pu.png')
            .addFields(
                { name: '[O][O][O][O][O]', value: 'Some value here' },
                { name: '\u200B', value: '\u200B' },)
            //.addField('Inline field title', 'Some value here', true)
            .setTimestamp()
            .setFooter({ text: 'Pourquoi tombons-nous?', iconURL: 'https://i.imgur.com/AfFp7pu.png' });
                
    const MessageStart = {embeds: [exampleEmbed], components: rows[0]};
    const MessageStart2 = {components: rows[1]};
    channel.send(MessageStart);
    channel.send(MessageStart2);

    // Send the message
}

function newGameInstance(channel) {
    // create an instance of the game for this channel
    const GAME = createGameForChannel(channel);
    return GAME;
}


client.on('interactionCreate', interaction => {
	if (!interaction.isButton()) return;

    const GAME = gameStorage[interaction.channel.id];
    const USER = interaction.user;

    if(interaction.customId == "start-game") {
        interaction.reply(`La partie commence, bonne chance !`);
    }

});


function createGameForChannel(channel) {
    gameStorage[channel.id] = {
        status: "waiting",
        word: null,
        players: {},
        lifePoints: 6,
        channel: channel,
        previousWord: [],
        purgeChannel() {
            this.channel.bulkDelete(100, true);
            gameStorage.deleteKey(channel.id);
        },
        getAllPlayers() {
            return this.players;
        },
        startGame() {

        },
        stopGame() {

        },
    }

    return gameStorage[channel.id];
}

function createAlphabetWithButtons() {
    const row1 = new MessageActionRow()
        .addComponents(new MessageButton().setCustomId('a').setLabel('a').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('z').setLabel('z').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('e').setLabel('e').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('r').setLabel('r').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('t').setLabel('t').setStyle('PRIMARY'),)
    const row2 = new MessageActionRow()
        .addComponents(new MessageButton().setCustomId('y').setLabel('y').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('u').setLabel('u').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('i').setLabel('i').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('o').setLabel('o').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('p').setLabel('p').setStyle('PRIMARY'),);
    const row3 = new MessageActionRow()
        .addComponents(new MessageButton().setCustomId('q').setLabel('q').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('s').setLabel('s').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('d').setLabel('d').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('f').setLabel('f').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('g').setLabel('g').setStyle('PRIMARY'),)
    const row4 = new MessageActionRow()    
        .addComponents(new MessageButton().setCustomId('h').setLabel('h').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('j').setLabel('j').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('k').setLabel('k').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('l').setLabel('l').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('m').setLabel('m').setStyle('PRIMARY'),);
    const row5 = new MessageActionRow()
        .addComponents(new MessageButton().setCustomId('w').setLabel('w').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('x').setLabel('x').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('c').setLabel('c').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('v').setLabel('v').setStyle('PRIMARY'),)
    const row6 = new MessageActionRow()
        .addComponents(new MessageButton().setCustomId('delete').setLabel('delete').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('b').setLabel('b').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('n').setLabel('n').setStyle('PRIMARY'),)
        .addComponents(new MessageButton().setCustomId('Enter').setLabel('validate').setStyle('PRIMARY'),);
    return [[row1, row2, row3, row4, row5], [row6]];
}
