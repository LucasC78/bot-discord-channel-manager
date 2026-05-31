require("dotenv").config();

const {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
} = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure la catégorie où créer les vocaux dynamiques")
    .addChannelOption((option) =>
      option
        .setName("categorie")
        .setDescription("Catégorie où créer les salons vocaux")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("addgame")
    .setDescription("Ajoute un salon vocal créateur pour un jeu")
    .addStringOption((option) =>
      option
        .setName("nom")
        .setDescription("Nom du jeu, ex: CS2, Valorant, Minecraft")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("emoji")
        .setDescription("Emoji du jeu, ex: 🎮")
        .setRequired(false),
    ),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function main() {
  try {
    console.log("Déploiement des commandes...");

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });

    console.log("Commandes déployées avec succès ✅");
  } catch (error) {
    console.error(error);
  }
}

main();
