const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('./config');

// ===== Base de données (JSON) =====
const FILE = path.join(__dirname, '..', 'data', 'db.json');

const DEFAULT = {
  warns: {},       // { guildId: { userId: [ { moderatorId, reason, date } ] } }
  tempbans: [],    // [ { guildId, userId, until } ]
  mutedRoles: {},  // { "guildId:userId": [roleIds] }
  lockBackups: {}, // { channelId: 'allow' | 'neutral' }
};

let data;

function load() {
  try {
    data = { ...structuredClone(DEFAULT), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch {
    data = structuredClone(DEFAULT);
  }
}

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

load();

const db = {
  get data() {
    return data;
  },
  save,
};

// ===== Durées =====
const UNITS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

// "10m", "2h", "1d", "2w", "30s" -> millisecondes (ou null si invalide)
function parseDuration(str) {
  const m = /^(\d+)\s*([smhdw])$/i.exec(str || '');
  if (!m) return null;
  const ms = parseInt(m[1], 10) * UNITS[m[2].toLowerCase()];
  return ms > 0 ? ms : null;
}

// millisecondes -> "1j 2h 3min"
function formatDuration(ms) {
  const table = [
    ['j', UNITS.d],
    ['h', UNITS.h],
    ['min', UNITS.m],
    ['s', UNITS.s],
  ];
  const parts = [];
  for (const [label, value] of table) {
    const n = Math.floor(ms / value);
    if (n) {
      parts.push(`${n}${label}`);
      ms -= n * value;
    }
  }
  return parts.join(' ') || '0s';
}



// ===== Helpers =====
const MUTE_ROLE_NAME = 'Muted';

const ok = (text) => new EmbedBuilder().setColor(0x57f287).setDescription(`✅ ${text}`);
const err = (text) => new EmbedBuilder().setColor(0xed4245).setDescription(`❌ ${text}`);
const usageErr = (cmd) => err(`Usage : \`${config.prefix}${cmd.name} ${cmd.usage || ''}\``.trim());

// Accepte une mention <@id> ou un ID brut
async function resolveUser(client, arg) {
  if (!arg) return null;
  const id = arg.replace(/[<@!>]/g, '');
  if (!/^\d{17,20}$/.test(id)) return null;
  return client.users.fetch(id).catch(() => null);
}

async function resolveMember(guild, user) {
  return guild.members.fetch(user.id).catch(() => null);
}

// Accepte #salon, <#id> ou un ID brut (salon courant par défaut)
function resolveChannel(message, arg) {
  if (!arg) return message.channel;
  const id = arg.replace(/[<#>]/g, '');
  return message.guild.channels.cache.get(id) || null;
}

// Retourne un message d'erreur si la sanction est impossible, sinon null
function checkHierarchy(message, user, member) {
  if (user.id === message.author.id) return 'Tu ne peux pas te sanctionner toi-même.';
  if (user.id === message.client.user.id) return 'Je ne peux pas me sanctionner moi-même.';
  if (user.id === message.guild.ownerId) return 'Impossible de sanctionner le propriétaire du serveur.';
  if (!member) return null;

  if (
    message.author.id !== message.guild.ownerId &&
    message.member.roles.highest.position <= member.roles.highest.position
  ) {
    return 'Ce membre a un rôle supérieur ou égal au tien.';
  }
  if (message.guild.members.me.roles.highest.position <= member.roles.highest.position) {
    return "Mon rôle n'est pas assez haut pour sanctionner ce membre.";
  }
  return null;
}

function hasAccess(member, perm) {
  if (config.modRoleIds.some((id) => member.roles.cache.has(id))) return true;
  return member.permissions.has(perm);
}

function auditReason(message, reason) {
  return `${message.author.tag} : ${reason}`.slice(0, 500);
}

// Prévient la personne sanctionnée en MP (silencieux si ses MP sont fermés)
async function dm(user, guild, action, reason, extra = '') {
  const embed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle(`Sanction : ${action}`)
    .setDescription(`Serveur : **${guild.name}**\nRaison : ${reason}${extra}`);
  await user.send({ embeds: [embed] }).catch(() => {});
}

// Interdit l'écriture / la parole au rôle Muted dans un salon
async function applyMuteOverwrites(channel, role) {
  if (!channel.permissionOverwrites) return; // fils de discussion
  await channel.permissionOverwrites
    .edit(role, {
      SendMessages: false,
      AddReactions: false,
      Speak: false,
      SendMessagesInThreads: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
    })
    .catch(() => {});
}

// Récupère (ou crée) le rôle Muted
async function getMuteRole(guild) {
  let role = guild.roles.cache.find((r) => r.name === MUTE_ROLE_NAME);
  if (role) return role;

  role = await guild.roles.create({
    name: MUTE_ROLE_NAME,
    permissions: [],
    reason: 'Création automatique du rôle de sourdine',
  });
  for (const channel of guild.channels.cache.values()) {
    await applyMuteOverwrites(channel, role);
  }
  return role;
}


// ===== Débannissement automatique =====
// Débannit automatiquement les tempbans arrivés à échéance
function startScheduler(client) {
  const tick = async () => {
    const now = Date.now();
    const due = db.data.tempbans.filter((b) => b.until <= now);
    if (!due.length) return;

    for (const ban of due) {
      const guild = client.guilds.cache.get(ban.guildId);
      if (guild) {
        await guild.members.unban(ban.userId, 'Fin du bannissement temporaire').catch(() => {});
      }
    }
    db.data.tempbans = db.data.tempbans.filter((b) => b.until > now);
    db.save();
  };

  tick();
  setInterval(tick, 30 * 1000);
}



module.exports = {
  db,
  parseDuration,
  formatDuration,
  MUTE_ROLE_NAME,
  ok,
  err,
  usageErr,
  resolveUser,
  resolveMember,
  resolveChannel,
  checkHierarchy,
  hasAccess,
  auditReason,
  dm,
  applyMuteOverwrites,
  getMuteRole,
  startScheduler,
};
