const Discord = require('discord.js');
const { MessageActionRow, MessageButton } = require('discord.js');
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

            let isRight = false;
            let messageTLC = message.content.toLocaleLowerCase('en-US');
            
            // for each possible answer 
            GAME.answers.forEach((e, i) => {

                // split the possible answers by space
                let differentWords = e.split(' ');
                let messageDifferentWords = messageTLC.split(' ');

 
                while (GAME.players[message.author.username].goodWords[i] === undefined) {
                    GAME.players[message.author.username].goodWords.push([]);
                }

                // If words are 80% similar to the answer we add it to the good words
                differentWords.forEach(word => {
                    messageDifferentWords.forEach(messageWord => {
                        if (similarity(word, messageWord) > 0.8) {
                            if (!GAME.players[message.author.username].goodWords[i].includes(word)) {
                                GAME.players[message.author.username].goodWords[i].push(word);
                            }
                        }
                    })
                });


                if (GAME.players[message.author.username].goodWords[i].length == differentWords.length) {
                    isRight = true;
                    // reset players answers parts
                    GAME.clearGoodWords();
                    // clear the timer for the hint
                    GAME.clearTimeout();
                }

            });


            if (isRight) {
                if (GAME.players.hasOwnProperty(message.author.username)) {

                    GAME.players[message.author.username].score += 1;
                    message.channel.send(`Bravo ${message.author.username}, vous avez trouvé la bonne réponse !`);
        
                    let winner = GAME.getWinner();
                    if (winner != null) {
                        // send the winner
                        message.channel.send(`Le gagnant est ${GAME.players[winner].name} avec ${GAME.players[winner].score} points !`);
                        // delete the actual game
                        GAME.purgeChannel();
                    } else {
                        setTimeout(function () {
                            GAME.askQuestion();
                        }, 1250);
                    }

                }
            }
        }

        /**
         * Commands management
         */

        if (message.content === '!points') {
            let points = GAME.getPlayerPoints(message.author.username);
            if (points !== false) {
                message.channel.send(`@${message.author.username} : vous avez ${points} points !`);
            } else {
                message.channel.send("Vous n'êtes pas dans la partie !");
            }
        }

        if (message.content === '!rank') {
            message.channel.send(GAME.getLeaderboard());
        }
        
        if (message.content === '!theme' && GAME.status !== 'playing') {
            GAME.updateTheme();
            message.channel.send(`Le thème de la partie est maintenant ${GAME.theme} !`);
        }

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
    setTheme(GAME);
    // Create the message with the interactive buttons
    const row = new MessageActionRow()
        .addComponents(
            new MessageButton()
                .setCustomId('join-game')
                .setLabel('Rejoindre la partie')
                .setStyle('SUCCESS'),
        ).addComponents(
            new MessageButton()
                .setCustomId('start-game')
                .setLabel('Lancer la partie')
                .setStyle('PRIMARY'),
        ).addComponents(
            new MessageButton()
                .setCustomId('stop-game')
                .setLabel('Arrêter la partie')
                .setStyle('DANGER')
                .setDisabled(true),
        ).addComponents(
            new MessageButton()
                .setCustomId('purge-launch')
                .setLabel('Purger le channel et relancer la partie')
                .setStyle('PRIMARY'),
        );

    const MessageStart = { content: `Quiz initialisé, le thème est : ${GAME.theme}, bonne chance !`, components: [row] };
    // Send the message
    channel.send(MessageStart);
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

    if(interaction.customId == "join-game") {
        if (!GAME.players.hasOwnProperty(USER.username)) {
            GAME.addPlayer(USER.username);
            interaction.reply(`${USER.username} a rejoint la partie !`);
        } else {
            interaction.reply(`${USER.username}, Vous êtes déjà dans la partie !`);
        }
    }

    if(interaction.customId == "start-game") {
        if (!gameStorage.hasOwnProperty(interaction.channel.id)) {
            const GAME = newGameInstance(interaction.channel);
        }

        interaction.message.components[0].components[1].setDisabled(true);
        interaction.message.components[0].components[2].setDisabled(false);
        interaction.update({
            components: interaction.message.components
        })

        interaction.message.channel.send(`La partie commence, bonne chance !`);
        // start the game with a 1 second delay
        setTimeout(function () {
            GAME.startGame();
        }, 1000);
    }

    if(interaction.customId == "stop-game") {
        interaction.message.components[0].components[1].setDisabled(false);
        interaction.message.components[0].components[2].setDisabled(true);
        interaction.update({
            components: interaction.message.components
        })

        interaction.message.channel.send("La partie est terminée, merci d'avoir joué !");
        GAME.stopGame(false);
    }

    if(interaction.customId == "purge-launch") {
        GAME.purgeChannel();
        interaction.reply(`Clean !`);
        createGameAndMessage(interaction.channel);
    }

    if(interaction.customId == "theme") {
        GAME.updateTheme();
        interaction.reply(`Le thème de la partie est maintenant ${GAME.theme} !`);
    }

    if(interaction.customId == "rank") {
        if (GAME.players.length > 0) {
            interaction.reply(GAME.getLeaderboard());
        } else {
            interaction.reply("Il n'y a pas encore de joueurs dans la partie !");
        }
    }

    if(interaction.customId == "players") {
        if (GAME.players.length > 0) {
            let players = GAME.getAllPlayers();
            let msg = "";
            for (let player in players) {
                msg += `${players[player].name}\n`;
            }
            interaction.reply(msg);
        } else {
            interaction.reply("Il n'y a pas encore de joueurs dans la partie !");
        }
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
            this.clearTimeout();
            gameStorage.deleteKey(channel.id);
        },
        addPlayer(name) {
            this.players[name] = {
                score: 0,
                name: name,
                goodWords: []
            }
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