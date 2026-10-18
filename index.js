require('dotenv').config();

const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');

const config = require('./mod-config');
const commandList = require('./mod-commands');
const { startScheduler, err, canUse, applyMuteOverwrites, MUTE_ROLE_NAME } = require('./mod-utils');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
  ],
  allowedMentions: { parse: [], repliedUser: false },
});

// Chargement des commandes
client.commands = new Collection();
for (const cmd of commandList) {
  client.commands.set(cmd.name, cmd);
  for (const alias of cmd.aliases || []) client.commands.set(alias, cmd);
}

client.once(Events.ClientReady, (c) => {
  console.log(`Connecté en tant que ${c.user.tag}`);
  startScheduler(client);
});

// Les nouveaux salons reçoivent automatiquement les restrictions du rôle Muted
client.on(Events.ChannelCreate, async (channel) => {
  const role = channel.guild?.roles.cache.find((r) => r.name === MUTE_ROLE_NAME);
  if (role) await applyMuteOverwrites(channel, role);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild || !message.member) return;
  if (!message.content.startsWith(config.prefix)) return;

  const args = message.content.slice(config.prefix.length).trim().split(/\s+/);
  const name = args.shift()?.toLowerCase();
  const cmd = client.commands.get(name);
  if (!cmd) return;

  if (!canUse(message.member, cmd.name)) {
    return message.reply({ embeds: [err("Tu n'as pas la permission d'utiliser cette commande.")] });
  }

  try {
    await cmd.run(message, args, client);
  } catch (error) {
    console.error(`Erreur dans ${config.prefix}${name} :`, error);
    message.reply({ embeds: [err("Une erreur est survenue pendant l'exécution de la commande.")] }).catch(() => {});
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN manquant : copie .env.example en .env et colle ton token.');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
