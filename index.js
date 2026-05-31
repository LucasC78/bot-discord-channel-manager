require("dotenv").config();

const fs = require("fs");
const express = require("express");

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");

const app = express();

app.get("/", (req, res) => {
  res.send("Channel Manager est en ligne ✅");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Serveur web actif.");
});

const CONFIG_FILE = "./config.json";

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({}, null, 2));
  }

  return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

const tempChannels = new Set();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once("ready", () => {
  console.log(`Bot connecté : ${client.user.tag}`);

  client.user.setPresence({
    status: "online",
    activities: [
      {
        name: "les vocaux dynamiques",
        type: 3,
      },
    ],
  });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (
    !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    return interaction.reply({
      content: "Tu dois être administrateur pour utiliser cette commande.",
      ephemeral: true,
    });
  }

  const config = loadConfig();
  const guildId = interaction.guild.id;

  if (interaction.commandName === "setup") {
    const category = interaction.options.getChannel("categorie");

    config[guildId] = {
      categoryId: category.id,
      games: config[guildId]?.games || {},
    };

    saveConfig(config);

    return interaction.reply({
      content: `Configuration enregistrée ✅\nCatégorie : **${category.name}**`,
      ephemeral: true,
    });
  }

  if (interaction.commandName === "addgame") {
    const guildConfig = config[guildId];

    if (!guildConfig?.categoryId) {
      return interaction.reply({
        content: "Utilise d'abord `/setup` pour choisir une catégorie.",
        ephemeral: true,
      });
    }

    const gameName = interaction.options.getString("nom");
    const emoji = interaction.options.getString("emoji") || "🎮";

    try {
      const creatorChannel = await interaction.guild.channels.create({
        name: `${emoji} Créer ton vocal ${gameName}`,
        type: ChannelType.GuildVoice,
        parent: guildConfig.categoryId,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
            ],
          },
        ],
      });

      guildConfig.games[creatorChannel.id] = {
        name: gameName,
        emoji,
      };

      saveConfig(config);

      return interaction.reply({
        content: `Salon créateur créé ✅\n**${creatorChannel.name}**`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);

      return interaction.reply({
        content:
          "Erreur : impossible de créer le salon. Vérifie mes permissions.",
        ephemeral: true,
      });
    }
  }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const config = loadConfig();
  const guildConfig = config[newState.guild.id] || config[oldState.guild.id];

  if (!guildConfig) return;

  const games = guildConfig.games || {};

  if (newState.channel && games[newState.channel.id]) {
    const game = games[newState.channel.id];
    const member = newState.member;

    try {
      const tempChannel = await newState.guild.channels.create({
        name: `${game.emoji} ${game.name} - ${member.user.username}`,
        type: ChannelType.GuildVoice,
        parent: newState.channel.parentId,
        permissionOverwrites: [
          {
            id: newState.guild.roles.everyone.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
            ],
          },
        ],
      });

      tempChannels.add(tempChannel.id);
      await member.voice.setChannel(tempChannel);
    } catch (error) {
      console.error("Erreur création vocal temporaire :", error);
    }
  }

  if (oldState.channel) {
    const oldChannel = oldState.channel;

    if (!tempChannels.has(oldChannel.id)) return;

    if (oldChannel.members.size === 0) {
      try {
        tempChannels.delete(oldChannel.id);
        await oldChannel.delete("Vocal temporaire vide");
        console.log(`Salon supprimé : ${oldChannel.name}`);
      } catch (error) {
        console.error("Erreur suppression vocal temporaire :", error);
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
