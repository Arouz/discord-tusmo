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
 /*   "8": './data/mots_8.txt',
    "9": './data/mots_9.txt',
     "10": './data/mots_10.txt',
    "11": './data/mots_11.txt',
    "12": './data/mots_12.txt', */
}


const secrets = require('./credentials/secrets.json');
const token = secrets.token;

// games data storage
const gameStorage = {
    recycleBin: [],
    recycleBinTimer: null,
    mandatoryMsg: [],
    images: {},
    createrecycleBinInterval() {
        this.recycleBinTimer = setInterval(() => {
            this.clearRecycleBin();
        }, 2500);
    },    
    clearRecycleBin() {
        this.recycleBin.forEach((item, index, object) => {
            if (this.mandatoryMsg.includes(item) == false) {
                item.delete();
                object.splice(index, 1);
            }
        });
    },
    deleteKey(key) {
        delete gameStorage[key]
    }
};

client.once('ready', async () => {
    console.log("ATUSMO ONLINE");
    // store images
    const cGame = await readFile('./assets/game-cell.png');
    gameStorage.images.game = new Canvas.Image();
    gameStorage.images.game.src = cGame;
    
    const cGood = await readFile('./assets/good-cell.png')
    gameStorage.images.good = new Canvas.Image();
    gameStorage.images.good.src = cGood;
    
    const cWrong = await readFile('./assets/wrong-placed-cell.png')
    gameStorage.images.wrong = new Canvas.Image();
    gameStorage.images.wrong.src = cWrong;
    
    gameStorage.createrecycleBinInterval();
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
                 
                GAME.attemps.push(message.content.toUpperCase());
                const image = await renderAccurateImage(GAME);
                GAME.updateImage(image);
    
                if (GAME.win) {
                    GAME.stopGame("Bravo, vous avez gagné !", 5000);
                    return;
                }
    
                if (GAME.attemps.length >= GAME.lifePoints) {
                    GAME.stopGame("Vous avez perdu, le mot était : " + GAME.word, 10000);
                    return;
                }
            }
        } else if (message.content == "!purge") {
            GAME.purgeChannel();
            return;
        }


    }

    if (message.content === '!game') {
        await createGameAndMessage(message.channel);
    }

    gameStorage.recycleBin.push(message);
})


async function createGameAndMessage(channel) {
    const GAME = await newGameInstance(channel);

    const row = new MessageActionRow().addComponents(new MessageButton().setCustomId('game-start').setLabel('Lancer').setStyle('PRIMARY'))
                                        .addComponents(new MessageButton().setCustomId('join').setLabel('Rejoindre').setStyle('SECONDARY'))
                                        .addComponents(new MessageButton().setCustomId('new-word').setLabel('Nouveau mot').setStyle('SUCCESS'));

    let message = await channel.send({components: [row]});
    gameStorage.mandatoryMsg.push(message);
}

async function newGameInstance(channel) {
    // create an instance of the game for this channel
    if (gameStorage.hasOwnProperty(channel.id)) {
        channel.bulkDelete(100, true);
        gameStorage.deleteKey(channel.id);
    }
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
        GAME.startGame();
    }

    if(interaction.customId == "join") {
        if (!GAME.players.hasOwnProperty(USER.username)) {
            GAME.addPlayer(USER.username);
            interaction.reply(`${USER.username} a rejoint la partie !`);
        } else {
            interaction.reply(`${USER.username}, Vous êtes déjà dans la partie !`);
        }
    }

    if(interaction.customId == "new-word") {
        await createGameAndMessage(interaction.channel);
    }

});


function createGameForChannel(channel) {
    gameStorage[channel.id] = {
        word: null,
        attemps: [],
        players: {},
        lifePoints: 6,
        channel: channel,
        previousWord: [],
        interaction: null,
        win: false,
        dictionary: [],
        purgeChannel() {
            this.channel.bulkDelete(100, true);
            gameStorage.deleteKey(channel.id);
        },
        async startGame() {
            const image = await renderAccurateImage(this);
            let message = await this.channel.send({ files: [image] });
            gameStorage.mandatoryMsg.push(message);
            this.interaction = message; 
        },
        stopGame(message, timer) {
            this.channel.send(message);
            setTimeout(() => {
                GAME.purgeChannel();
            }, timer);
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

    let nLetters = GAME.word.length,
        theWord = GAME.word.toUpperCase(),
        attemps = GAME.attemps,
        rounds = GAME.attemps.length;

    const canvas = Canvas.createCanvas(nLetters * 64, 384);
    const context = canvas.getContext('2d');

    context.font = '24px sans-serif';
    context.fillStyle = '#ffffff';

    for (let j = 0; j < rounds; j++) {

        let wordCopy = theWord.split('');
        let wellPlaced = 0;

        for (let i = 0; i < nLetters; i++) {

            if (attemps[j][i] === theWord[i]) {
                context.drawImage(gameStorage.images.good, i * 64, j * 64, 64, 64);
                context.fillText(attemps[j][i], i * 64 + 25, j * 64 + 38);
                wordCopy[i] = null;
                wellPlaced++;
            } else if (wordCopy.includes(attemps[j][i])) {
                context.drawImage(gameStorage.images.wrong, i * 64, j * 64, 64, 64);
                context.fillText(attemps[j][i], i * 64 + 25, j * 64 + 38);
                let index = wordCopy.indexOf(attemps[j][i]);

                wordCopy[index] = null;

            } else {
                context.drawImage(gameStorage.images.game, i * 64, j * 64, 64, 64);
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
                    context.drawImage(gameStorage.images.good, i * 64, j * 64, 64, 64);
                    context.fillText(theWord[i], i * 64 + 25, j * 64 + 38);
                } else if (j == rounds && i > 0) {
                    context.drawImage(gameStorage.images.game, i * 64, j * 64, 64, 64);
                    context.fillText("_", i * 64 + 25, j * 64 + 38);
                } else {
                    context.drawImage(gameStorage.images.game, i * 64, j * 64, 64, 64);
                }
            }
        }
    } else {
        for (let j = rounds; j < 6; j++) {
            for (let i = 0; i < nLetters; i++) {
                context.drawImage(gameStorage.images.game, i * 64, j * 64, 64, 64);
            }
        }
    }


    const attachment = new MessageAttachment(canvas.toBuffer('image/png'), 'profile-image.png');

    return attachment;
}