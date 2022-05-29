const Discord = require('discord.js');
const { MessageActionRow, MessageButton, MessageEmbed, MessageAttachment } = require('discord.js');
const client = new Discord.Client({intents: 513});
const Canvas = require('@napi-rs/canvas');
const { readFile } = require('fs/promises');
const {readFileSync, promises: fsPromises} = require('fs');

const dataWords = {
    "4": './data/mots_4.txt',
    "5": './data/mots_5.txt',
    "6": './data/mots_6.txt',
    "7": './data/mots_7.txt',
    "8": './data/mots_8.txt',
    "9": './data/mots_9.txt',
/*     "10": './data/mots_10.txt',
    "11": './data/mots_11.txt',
    "12": './data/mots_12.txt', */
}

const token = "OTgwMzAxOTc1ODQ3NTY3Mzkw.GS_ir4.XnO5AGsBEudBA9La1FdHcpjJ3iSYyQMqi9acwA";

// games data storage
const gameStorage = {deleteKey(key) {delete gameStorage[key]}};

client.once('ready', () => {
    console.log("RUNNING");
});
client.login(token);

 
client.on('messageCreate', async function (message) {

    if (gameStorage.hasOwnProperty(message.channel.id)) {

        const GAME = gameStorage[message.channel.id];

        // Answer management - Only if the message author is in the game
        if (GAME.answers !== null && GAME.players.hasOwnProperty(message.author.username) && message.content != "!purge") {
            if (message.content.length != GAME.word.length) {
                message.channel.send("Votre proposition doit être de la même longueur que le mot à deviner");
            } else if (!GAME.dictionary.includes(message.content)) {
                message.channel.send("Ce mot n'est pas dans le dictionnaire !");
            } else {
                GAME.try++; 
                GAME.attemps.push(message.content.toUpperCase());
                const image = await renderAccurateImage(GAME);
                GAME.updateImage(image);
    
                if (GAME.win) {
                    message.channel.send("Bravo, vous avez gagné !");
                    setTimeout(() => {
                        GAME.purgeChannel();
                    }, 6000);
                    return;
                }
    
                if (GAME.try >= GAME.lifePoints) {
                    message.channel.send("Vous avez perdu, le mot était : " + GAME.word);
                    setTimeout(() => {
                        GAME.purgeChannel();
                    }, 6000);
                    return;
                }
            }
        }

        if (message.content === '!purge') { 
            GAME.purgeChannel();
            return;
        }
    }

    if (message.content === '!game') {
        createGameAndMessage(message.channel);
    }

    setTimeout(() => {
        autoDeleteMsg(message);
    }, 3000);

})

function autoDeleteMsg(msg) {
    if (gameStorage.hasOwnProperty(msg.channel.id)) {
        if (!gameStorage[msg.channel.id].messages.includes(msg)) {
            msg.delete();
        }
    }
}

async function createGameAndMessage(channel) {
    const GAME = newGameInstance(channel);
    const row = new MessageActionRow().addComponents(new MessageButton().setCustomId('game-start').setLabel('start').setStyle('PRIMARY'))
                                        .addComponents(new MessageButton().setCustomId('join').setLabel('join').setStyle('SECONDARY'));

    let message = await channel.send({components: [row]});
    GAME.messages.push(message);
}

function newGameInstance(channel) {
    // create an instance of the game for this channel
    const GAME = createGameForChannel(channel);
    GAME.word = getRandomData(GAME);
    return GAME;
}



function getRandomData(GAME) {
    let mots = Object.keys(dataWords)[Math.floor(Math.random() * Object.keys(dataWords).length)];
    let file = dataWords[mots];
    GAME.dictionary = syncReadFileAndReturnWord(file);
    let randomWord = GAME.dictionary[Math.floor(Math.random() * GAME.dictionary.length)];
    return randomWord;
}


// ✅ read file SYNCHRONOUSLY
function syncReadFileAndReturnWord(filename) {
  const contents = readFileSync(filename, 'utf-8');
  const arr = contents.split(/\r?\n/);
  return arr;
}


client.on('interactionCreate', async interaction => {
	if (!interaction.isButton()) return;

    const GAME = gameStorage[interaction.channel.id];
    const USER = interaction.user;
    
    if(interaction.customId == "game-start") {
        interaction.reply("La game se lance !");
        const image = await renderAccurateImage(GAME);
        let message = await interaction.channel.send({ files: [image] });
        GAME.messages.push(message);
        GAME.interaction = message; 
    }

    if(interaction.customId == "join") {
        if (!GAME.players.hasOwnProperty(USER.username)) {
            GAME.addPlayer(USER.username);
            interaction.reply(`${USER.username} a rejoint la partie !`);
        } else {
            interaction.reply(`${USER.username}, Vous êtes déjà dans la partie !`);
        }
    }

});


function createGameForChannel(channel) {
    gameStorage[channel.id] = {
        status: "waiting",
        word: null,
        attemps: [],
        players: {},
        lifePoints: 6,
        channel: channel,
        previousWord: [],
        interaction: null,
        win: false,
        try: 0,
        dictionary: [],
        messages: [],
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
        updateImage(img) {
            this.interaction.edit({
                files: [img]
            })
        },        
        addPlayer(name) {
            this.players[name] = {
                name: name,
            }
        },
    }

    return gameStorage[channel.id];
}

async function renderAccurateImage(GAME) {

    let nLetters = GAME.word.length;
    let theWord = GAME.word.toUpperCase();

    let attemps = GAME.attemps;
    let rounds = GAME.attemps.length;

    // Game cell = 64px / 64px
    // answer cell = 60px / 60px
    // height = 6 x 64px = 384px
    // width = nLetters x 64px = nLetters x 64px
    const canvas = Canvas.createCanvas(nLetters * 64, 384);
    const context = canvas.getContext('2d');

    context.font = '24px sans-serif';
    // Select the style that will be used to fill the text in
    context.fillStyle = '#ffffff';

    // game cell
    const gameCellFile = await readFile('./assets/game-cell.png');
	const gameCell = new Canvas.Image();
	gameCell.src = gameCellFile;

    // good cell 
    const goodCellFile = await readFile('./assets/good-cell.png');
    const goodCell = new Canvas.Image();
    goodCell.src = goodCellFile;

    // bad cell
    const badCellFile = await readFile('./assets/wrong-place-cell.png');
    const badCell = new Canvas.Image();
    badCell.src = badCellFile;

    for (let j = 0; j < rounds; j++) {

        let wordCopy = theWord.split('');
        let wellPlaced = 0;

        for (let i = 0; i < nLetters; i++) {

            if (attemps[j][i] === theWord[i]) {
                context.drawImage(goodCell, i * 64, j * 64, 64, 64);
                context.fillText(attemps[j][i], i * 64 + 25, j * 64 + 38);
                wordCopy[i] = null;
                wellPlaced++;
            } else if (wordCopy.includes(attemps[j][i])) {
                context.drawImage(badCell, i * 64, j * 64, 64, 64);
                context.fillText(attemps[j][i], i * 64 + 25, j * 64 + 38);
                let index = wordCopy.indexOf(attemps[j][i]);

                wordCopy[index] = null;

            } else {
                context.drawImage(gameCell, i * 64, j * 64, 64, 64);
                context.fillText(attemps[j][i], i * 64 + 25, j * 64 + 38);
            }

        }

        if (wellPlaced == nLetters) {
            GAME.win = true;
        }
    }

    if (!GAME.win) {
        for (let j = rounds; j < 6; j++) { 
            for (let i = 0; i < nLetters; i++) {
    
                if (j == rounds && i == 0) {
                    context.drawImage(goodCell, i * 64, j * 64, 64, 64);
                    context.fillText(theWord[i], i * 64 + 25, j * 64 + 38);
                } else if (j == rounds && i > 0) {
                    context.drawImage(gameCell, i * 64, j * 64, 64, 64);
                    context.fillText("_", i * 64 + 25, j * 64 + 38);
                } else {
                    context.drawImage(gameCell, i * 64, j * 64, 64, 64);
                }
            }
        }
    } else {
        for (let j = rounds; j < 6; j++) {
            for (let i = 0; i < nLetters; i++) {
                context.drawImage(gameCell, i * 64, j * 64, 64, 64);
            }
        }
    }


    const attachment = new MessageAttachment(canvas.toBuffer('image/png'), 'profile-image.png');

    return attachment;
}

String.prototype.replaceAt = function(index, replacement) {
    return this.substring(0, index) + replacement + this.substring(index + replacement.length);
}