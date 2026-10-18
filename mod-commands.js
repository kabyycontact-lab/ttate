// Toutes les commandes du bot, regroupées dans un seul fichier.
const commands = [];

// ===== +ban =====
commands.push(
  (() => {
const { PermissionFlagsBits } = require('discord.js');
const { resolveUser, resolveMember, checkHierarchy, auditReason, dm, ok, err, usageErr } = require('./mod-utils');

const cmd = {
  name: 'ban',
  category: 'Modération',
  usage: '<user/id> [raison]',
  description: 'Bannir un membre du serveur.',
  perm: PermissionFlagsBits.BanMembers,

  async run(message, args, client) {
    const user = await resolveUser(client, args[0]);
    if (!user) return message.reply({ embeds: [usageErr(cmd)] });

    const member = await resolveMember(message.guild, user);
    const problem = checkHierarchy(message, user, member);
    if (problem) return message.reply({ embeds: [err(problem)] });

    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';

    try {
      await dm(user, message.guild, 'Bannissement', reason);
      await message.guild.members.ban(user, { reason: auditReason(message, reason) });
    } catch (e) {
      return message.reply({ embeds: [err(`Impossible de bannir ce membre : ${e.message}`)] });
    }

    message.reply({ embeds: [ok(`**${user.tag}** a été banni. Raison : ${reason}`)] });
  },
};

    return cmd;
  })(),
);

// ===== +unban =====
commands.push(
  (() => {
const { PermissionFlagsBits } = require('discord.js');
const db = require('./mod-utils').db;
const { resolveUser, auditReason, ok, err, usageErr } = require('./mod-utils');

const cmd = {
  name: 'unban',
  category: 'Modération',
  usage: '<user/id> [raison]',
  description: 'Débannir un utilisateur.',
  perm: PermissionFlagsBits.BanMembers,

  async run(message, args, client) {
    const user = await resolveUser(client, args[0]);
    if (!user) return message.reply({ embeds: [usageErr(cmd)] });

    const ban = await message.guild.bans.fetch(user.id).catch(() => null);
    if (!ban) return message.reply({ embeds: [err("Cet utilisateur n'est pas banni.")] });

    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';

    try {
      await message.guild.members.unban(user.id, auditReason(message, reason));
    } catch (e) {
      return message.reply({ embeds: [err(`Impossible de débannir : ${e.message}`)] });
    }

    // Retire un éventuel tempban en attente
    db.data.tempbans = db.data.tempbans.filter((b) => !(b.guildId === message.guild.id && b.userId === user.id));
    db.save();

    message.reply({ embeds: [ok(`**${user.tag}** a été débanni. Raison : ${reason}`)] });
  },
};

    return cmd;
  })(),
);

// ===== +kick =====
commands.push(
  (() => {
const { PermissionFlagsBits } = require('discord.js');
const { resolveUser, resolveMember, checkHierarchy, auditReason, dm, ok, err, usageErr } = require('./mod-utils');

const cmd = {
  name: 'kick',
  category: 'Modération',
  usage: '<user/id> [raison]',
  description: 'Expulser un membre du serveur.',
  perm: PermissionFlagsBits.KickMembers,

  async run(message, args, client) {
    const user = await resolveUser(client, args[0]);
    if (!user) return message.reply({ embeds: [usageErr(cmd)] });

    const member = await resolveMember(message.guild, user);
    if (!member) return message.reply({ embeds: [err("Ce membre n'est pas sur le serveur.")] });

    const problem = checkHierarchy(message, user, member);
    if (problem) return message.reply({ embeds: [err(problem)] });

    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';

    try {
      await dm(user, message.guild, 'Expulsion', reason);
      await member.kick(auditReason(message, reason));
    } catch (e) {
      return message.reply({ embeds: [err(`Impossible d'expulser ce membre : ${e.message}`)] });
    }

    message.reply({ embeds: [ok(`**${user.tag}** a été expulsé. Raison : ${reason}`)] });
  },
};

    return cmd;
  })(),
);

// ===== +mute =====
commands.push(
  (() => {
const { PermissionFlagsBits } = require('discord.js');
const db = require('./mod-utils').db;
const {
  resolveUser,
  resolveMember,
  checkHierarchy,
  auditReason,
  getMuteRole,
  dm,
  ok,
  err,
  usageErr,
} = require('./mod-utils');

const cmd = {
  name: 'mute',
  category: 'Modération',
  usage: '<user/id> [raison]',
  description: 'Mettre en sourdine un membre (sauvegarde et retire tous ses rôles).',
  perm: PermissionFlagsBits.ModerateMembers,

  async run(message, args, client) {
    const user = await resolveUser(client, args[0]);
    if (!user) return message.reply({ embeds: [usageErr(cmd)] });

    const member = await resolveMember(message.guild, user);
    if (!member) return message.reply({ embeds: [err("Ce membre n'est pas sur le serveur.")] });

    const problem = checkHierarchy(message, user, member);
    if (problem) return message.reply({ embeds: [err(problem)] });

    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';
    const guild = message.guild;

    try {
      const muteRole = await getMuteRole(guild);
      if (member.roles.cache.has(muteRole.id)) {
        return message.reply({ embeds: [err('Ce membre est déjà en sourdine.')] });
      }

      // On sauvegarde les rôles, on garde seulement les rôles gérés (boost, bots)
      const saved = member.roles.cache.filter((r) => r.id !== guild.id && !r.managed).map((r) => r.id);
      const kept = member.roles.cache.filter((r) => r.managed).map((r) => r.id);

      db.data.mutedRoles[`${guild.id}:${user.id}`] = saved;
      db.save();

      await member.roles.set([...kept, muteRole.id], auditReason(message, reason));
    } catch (e) {
      return message.reply({ embeds: [err(`Impossible de mettre en sourdine : ${e.message}`)] });
    }

    await dm(user, guild, 'Sourdine', reason);
    message.reply({ embeds: [ok(`**${user.tag}** a été mis en sourdine. Raison : ${reason}`)] });
  },
};

    return cmd;
  })(),
);

// ===== +unmute =====
commands.push(
  (() => {
const { PermissionFlagsBits } = require('discord.js');
const db = require('./mod-utils').db;
const { resolveUser, resolveMember, auditReason, MUTE_ROLE_NAME, ok, err, usageErr } = require('./mod-utils');

const cmd = {
  name: 'unmute',
  category: 'Modération',
  usage: '<user/id>',
  description: 'Retirer la sourdine d\'un membre (mute rôle OU timeout Discord).',
  perm: PermissionFlagsBits.ModerateMembers,

  async run(message, args, client) {
    const user = await resolveUser(client, args[0]);
    if (!user) return message.reply({ embeds: [usageErr(cmd)] });

    const member = await resolveMember(message.guild, user);
    if (!member) return message.reply({ embeds: [err("Ce membre n'est pas sur le serveur.")] });

    const guild = message.guild;
    const reason = auditReason(message, 'Fin de la sourdine');
    const muteRole = guild.roles.cache.find((r) => r.name === MUTE_ROLE_NAME);
    const timedOut = member.communicationDisabledUntilTimestamp > Date.now();
    const roleMuted = muteRole && member.roles.cache.has(muteRole.id);

    if (!timedOut && !roleMuted) {
      return message.reply({ embeds: [err("Ce membre n'est pas en sourdine.")] });
    }

    try {
      if (timedOut) await member.timeout(null, reason);

      if (roleMuted) {
        const key = `${guild.id}:${user.id}`;
        const saved = (db.data.mutedRoles[key] || []).filter((id) => guild.roles.cache.has(id));
        const current = member.roles.cache.filter((r) => r.id !== guild.id && r.id !== muteRole.id).map((r) => r.id);

        await member.roles.set([...new Set([...current, ...saved])], reason);
        delete db.data.mutedRoles[key];
        db.save();
      }
    } catch (e) {
      return message.reply({ embeds: [err(`Impossible de retirer la sourdine : ${e.message}`)] });
    }

    message.reply({ embeds: [ok(`**${user.tag}** n'est plus en sourdine.`)] });
  },
};

    return cmd;
  })(),
);

// ===== +warn =====
commands.push(
  (() => {
const { PermissionFlagsBits } = require('discord.js');
const db = require('./mod-utils').db;
const { resolveUser, resolveMember, checkHierarchy, dm, ok, err, usageErr } = require('./mod-utils');

const cmd = {
  name: 'warn',
  category: 'Modération',
  usage: '<user/id> [raison]',
  description: 'Avertir un membre.',
  perm: PermissionFlagsBits.ModerateMembers,

  async run(message, args, client) {
    const user = await resolveUser(client, args[0]);
    if (!user) return message.reply({ embeds: [usageErr(cmd)] });
    if (user.bot) return message.reply({ embeds: [err('Tu ne peux pas avertir un bot.')] });

    const member = await resolveMember(message.guild, user);
    const problem = checkHierarchy(message, user, member);
    if (problem) return message.reply({ embeds: [err(problem)] });

    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';

    const guildWarns = (db.data.warns[message.guild.id] ||= {});
    const userWarns = (guildWarns[user.id] ||= []);
    userWarns.push({ moderatorId: message.author.id, reason, date: Date.now() });
    db.save();

    await dm(user, message.guild, 'Avertissement', reason, `\nWarns au total : **${userWarns.length}**`);
    message.reply({
      embeds: [ok(`**${user.tag}** a été averti (warn n°${userWarns.length}). Raison : ${reason}`)],
    });
  },
};

    return cmd;
  })(),
);

// ===== +unwarn =====
commands.push(
  (() => {
const { PermissionFlagsBits } = require('discord.js');
const db = require('./mod-utils').db;
const { resolveUser, ok, err, usageErr } = require('./mod-utils');

const cmd = {
  name: 'unwarn',
  aliases: ['rwarn'],
  category: 'Modération',
  usage: '<user/id> <n°|all>',
  description: 'Supprimer un ou tous les warns d\'un membre.',
  perm: PermissionFlagsBits.ModerateMembers,

  async run(message, args, client) {
    const user = await resolveUser(client, args[0]);
    const target = (args[1] || '').toLowerCase();
    if (!user || !target) return message.reply({ embeds: [usageErr(cmd)] });

    const warns = db.data.warns[message.guild.id]?.[user.id] || [];
    if (!warns.length) return message.reply({ embeds: [err("Ce membre n'a aucun warn.")] });

    if (target === 'all') {
      delete db.data.warns[message.guild.id][user.id];
      db.save();
      return message.reply({ embeds: [ok(`Les **${warns.length}** warn(s) de **${user.tag}** ont été supprimés.`)] });
    }

    const index = parseInt(target, 10);
    if (!Number.isInteger(index) || index < 1 || index > warns.length) {
      return message.reply({ embeds: [err(`Numéro invalide : choisis entre 1 et ${warns.length}, ou \`all\`.`)] });
    }

    warns.splice(index - 1, 1);
    if (!warns.length) delete db.data.warns[message.guild.id][user.id];
    db.save();

    message.reply({ embeds: [ok(`Le warn n°${index} de **${user.tag}** a été supprimé.`)] });
  },
};

    return cmd;
  })(),
);

// ===== +warnlist =====
commands.push(
  (() => {
const { EmbedBuilder } = require('discord.js');
const config = require('./mod-config');
const db = require('./mod-utils').db;
const { resolveUser, getLevel, err } = require('./mod-utils');

const cmd = {
  name: 'warnlist',
  category: 'Modération',
  usage: '[user/id]',
  description: 'Afficher les warns d\'un membre (ou les siens sans argument).',
  perm: null, // tout le monde peut voir ses propres warns

  async run(message, args, client) {
    let user = message.author;

    if (args[0]) {
      if (getLevel(message.member) < config.warnlistOthersLevel) {
        return message.reply({ embeds: [err("Tu n'as pas la permission de voir les warns des autres membres.")] });
      }
      user = await resolveUser(client, args[0]);
      if (!user) return message.reply({ embeds: [err('Utilisateur introuvable.')] });
    }

    const warns = db.data.warns[message.guild.id]?.[user.id] || [];

    let description = warns
      .map(
        (w, i) =>
          `**#${i + 1}** — <t:${Math.floor(w.date / 1000)}:d> par <@${w.moderatorId}>\n> ${w.reason}`,
      )
      .join('\n\n');
    if (!description) description = 'Aucun warn.';
    if (description.length > 4000) description = `${description.slice(0, 3990)}\n…`;

    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle(`⚠️ Warns de ${user.tag} (${warns.length})`)
      .setDescription(description);

    message.reply({ embeds: [embed] });
  },
};

    return cmd;
  })(),
);

// ===== +slowmode =====
commands.push(
  (() => {
const { PermissionFlagsBits } = require('discord.js');
const { parseDuration, formatDuration } = require('./mod-utils');
const { auditReason, ok, err, usageErr } = require('./mod-utils');

const MAX_SECONDS = 6 * 60 * 60; // limite Discord : 6h

const cmd = {
  name: 'slowmode',
  category: 'Modération',
  usage: '<durée|off> [raison]',
  description: 'Définir le slowmode d\'un salon.',
  perm: PermissionFlagsBits.ManageChannels,

  async run(message, args) {
    const input = (args[0] || '').toLowerCase();
    if (!input) return message.reply({ embeds: [usageErr(cmd)] });

    // "off" / "0" désactive ; "10" = 10 secondes ; "10s", "5m", "1h" acceptés
    let seconds;
    if (input === 'off' || input === '0') {
      seconds = 0;
    } else if (/^\d+$/.test(input)) {
      seconds = parseInt(input, 10);
    } else {
      const ms = parseDuration(input);
      if (ms === null) {
        return message.reply({ embeds: [err('Durée invalide. Exemples : `10`, `30s`, `5m`, `1h`, `off`.')] });
      }
      seconds = Math.floor(ms / 1000);
    }

    if (seconds > MAX_SECONDS) {
      return message.reply({ embeds: [err('Le slowmode maximum est de 6 heures.')] });
    }

    const reason = args.slice(1).join(' ') || 'Aucune raison fournie';

    try {
      await message.channel.setRateLimitPerUser(seconds, auditReason(message, reason));
    } catch (e) {
      return message.reply({ embeds: [err(`Impossible de modifier le slowmode : ${e.message}`)] });
    }

    message.reply({
      embeds: [
        ok(seconds === 0 ? 'Slowmode désactivé.' : `Slowmode défini sur **${formatDuration(seconds * 1000)}**.`),
      ],
    });
  },
};

    return cmd;
  })(),
);

// ===== +lock =====
commands.push(
  (() => {
const { PermissionFlagsBits } = require('discord.js');
const db = require('./mod-utils').db;
const { resolveChannel, ok, err } = require('./mod-utils');

const cmd = {
  name: 'lock',
  category: 'Modération',
  usage: '[#salon | id]',
  description: 'Verrouille un salon texte (@everyone ne peut plus écrire).',
  perm: PermissionFlagsBits.ManageChannels,

  async run(message, args) {
    const channel = resolveChannel(message, args[0]);
    if (!channel || !channel.isTextBased() || !channel.permissionOverwrites) {
      return message.reply({ embeds: [err('Salon texte introuvable.')] });
    }

    const everyone = message.guild.roles.everyone;
    const overwrite = channel.permissionOverwrites.cache.get(everyone.id);

    if (overwrite?.deny.has('SendMessages')) {
      return message.reply({ embeds: [err('Ce salon est déjà verrouillé.')] });
    }

    // On mémorise l'état précédent pour le restaurer avec +unlock
    db.data.lockBackups[channel.id] = overwrite?.allow.has('SendMessages') ? 'allow' : 'neutral';
    db.save();

    try {
      await channel.permissionOverwrites.edit(everyone, { SendMessages: false }, { reason: `Lock par ${message.author.tag}` });
    } catch (e) {
      return message.reply({ embeds: [err(`Impossible de verrouiller le salon : ${e.message}`)] });
    }

    message.reply({ embeds: [ok(`<#${channel.id}> est maintenant verrouillé.`)] });
  },
};

    return cmd;
  })(),
);

// ===== +unlock =====
commands.push(
  (() => {
const { PermissionFlagsBits } = require('discord.js');
const db = require('./mod-utils').db;
const { resolveChannel, ok, err } = require('./mod-utils');

const cmd = {
  name: 'unlock',
  category: 'Modération',
  usage: '[#salon | id]',
  description: 'Déverrouille un salon texte (remet les anciennes permissions).',
  perm: PermissionFlagsBits.ManageChannels,

  async run(message, args) {
    const channel = resolveChannel(message, args[0]);
    if (!channel || !channel.isTextBased() || !channel.permissionOverwrites) {
      return message.reply({ embeds: [err('Salon texte introuvable.')] });
    }

    const everyone = message.guild.roles.everyone;
    const overwrite = channel.permissionOverwrites.cache.get(everyone.id);

    if (!overwrite?.deny.has('SendMessages')) {
      return message.reply({ embeds: [err("Ce salon n'est pas verrouillé.")] });
    }

    // 'allow' = @everyone avait le droit explicite avant le lock, sinon on le remet à neutre
    const previous = db.data.lockBackups[channel.id] === 'allow' ? true : null;

    try {
      await channel.permissionOverwrites.edit(everyone, { SendMessages: previous }, { reason: `Unlock par ${message.author.tag}` });
    } catch (e) {
      return message.reply({ embeds: [err(`Impossible de déverrouiller le salon : ${e.message}`)] });
    }

    delete db.data.lockBackups[channel.id];
    db.save();

    message.reply({ embeds: [ok(`<#${channel.id}> est de nouveau ouvert.`)] });
  },
};

    return cmd;
  })(),
);

// ===== +clear =====
commands.push(
  (() => {
const { PermissionFlagsBits } = require('discord.js');
const { ok, err, usageErr } = require('./mod-utils');

const MAX_CLEAR = 1000;

const cmd = {
  name: 'clear',
  category: 'Modération',
  usage: '<nombre>',
  description: 'Supprime un nombre de messages dans le salon actuel.',
  perm: PermissionFlagsBits.ManageMessages,

  async run(message, args) {
    const amount = parseInt(args[0], 10);
    if (!Number.isInteger(amount)) return message.reply({ embeds: [usageErr(cmd)] });
    if (amount < 1 || amount > MAX_CLEAR) {
      return message.reply({ embeds: [err(`Choisis un nombre entre 1 et ${MAX_CLEAR}.`)] });
    }

    // On supprime d'abord la commande elle-même
    await message.delete().catch(() => {});

    let remaining = amount;
    let deleted = 0;
    try {
      while (remaining > 0) {
        const batch = Math.min(100, remaining);
        const result = await message.channel.bulkDelete(batch, true); // ignore les messages de +14 jours
        deleted += result.size;
        remaining -= batch;
        if (result.size < batch) break;
      }
    } catch (e) {
      return message.channel.send({ embeds: [err(`Impossible de supprimer les messages : ${e.message}`)] });
    }

    const notice = await message.channel.send({
      embeds: [ok(`**${deleted}** message(s) supprimé(s).${deleted < amount ? ' (Les messages de plus de 14 jours ne peuvent pas être supprimés.)' : ''}`)],
    });
    setTimeout(() => notice.delete().catch(() => {}), 4000);
  },
};

    return cmd;
  })(),
);

// ===== +tempban =====
commands.push(
  (() => {
const { PermissionFlagsBits } = require('discord.js');
const db = require('./mod-utils').db;
const { parseDuration, formatDuration } = require('./mod-utils');
const { resolveUser, resolveMember, checkHierarchy, auditReason, dm, ok, err, usageErr } = require('./mod-utils');

const cmd = {
  name: 'tempban',
  category: 'Temporaire',
  usage: '<user/id> <durée: 10m/2h/1d/2w> [raison]',
  description: 'Bannir temporairement un membre.',
  perm: PermissionFlagsBits.BanMembers,

  async run(message, args, client) {
    const user = await resolveUser(client, args[0]);
    if (!user || !args[1]) return message.reply({ embeds: [usageErr(cmd)] });

    const duration = parseDuration(args[1]);
    if (!duration) {
      return message.reply({ embeds: [err('Durée invalide. Exemples : `10m`, `2h`, `1d`, `2w`.')] });
    }

    const member = await resolveMember(message.guild, user);
    const problem = checkHierarchy(message, user, member);
    if (problem) return message.reply({ embeds: [err(problem)] });

    const reason = args.slice(2).join(' ') || 'Aucune raison fournie';
    const label = formatDuration(duration);

    try {
      await dm(user, message.guild, 'Bannissement temporaire', reason, `\nDurée : **${label}**`);
      await message.guild.members.ban(user, { reason: auditReason(message, `[tempban ${label}] ${reason}`) });
    } catch (e) {
      return message.reply({ embeds: [err(`Impossible de bannir ce membre : ${e.message}`)] });
    }

    // Planifie le débannissement automatique (vérifié toutes les 30 s)
    db.data.tempbans = db.data.tempbans.filter((b) => !(b.guildId === message.guild.id && b.userId === user.id));
    db.data.tempbans.push({ guildId: message.guild.id, userId: user.id, until: Date.now() + duration });
    db.save();

    message.reply({
      embeds: [ok(`**${user.tag}** a été banni pour **${label}**. Raison : ${reason}`)],
    });
  },
};

    return cmd;
  })(),
);

// ===== +tempmute =====
commands.push(
  (() => {
const { PermissionFlagsBits } = require('discord.js');
const { parseDuration, formatDuration } = require('./mod-utils');
const { resolveUser, resolveMember, checkHierarchy, auditReason, dm, ok, err, usageErr } = require('./mod-utils');

const MAX_TIMEOUT = 28 * 24 * 60 * 60 * 1000; // limite Discord : 28 jours

const cmd = {
  name: 'tempmute',
  category: 'Temporaire',
  usage: '<user/id> <durée: 10m/2h/1d> [raison]',
  description: 'Mettre en sourdine temporairement un membre (timeout Discord natif).',
  perm: PermissionFlagsBits.ModerateMembers,

  async run(message, args, client) {
    const user = await resolveUser(client, args[0]);
    if (!user || !args[1]) return message.reply({ embeds: [usageErr(cmd)] });

    const duration = parseDuration(args[1]);
    if (!duration) {
      return message.reply({ embeds: [err('Durée invalide. Exemples : `10m`, `2h`, `1d`.')] });
    }
    if (duration > MAX_TIMEOUT) {
      return message.reply({ embeds: [err('La durée maximum d\'un timeout Discord est de 28 jours.')] });
    }

    const member = await resolveMember(message.guild, user);
    if (!member) return message.reply({ embeds: [err("Ce membre n'est pas sur le serveur.")] });

    const problem = checkHierarchy(message, user, member);
    if (problem) return message.reply({ embeds: [err(problem)] });

    const reason = args.slice(2).join(' ') || 'Aucune raison fournie';
    const label = formatDuration(duration);

    try {
      await member.timeout(duration, auditReason(message, reason));
    } catch (e) {
      return message.reply({ embeds: [err(`Impossible de mettre en sourdine : ${e.message}`)] });
    }

    await dm(user, message.guild, 'Sourdine temporaire', reason, `\nDurée : **${label}**`);
    message.reply({
      embeds: [ok(`**${user.tag}** est en sourdine pour **${label}**. Raison : ${reason}`)],
    });
  },
};

    return cmd;
  })(),
);

// ===== +cmds =====
commands.push(
  (() => {
const { EmbedBuilder } = require('discord.js');
const config = require('./mod-config');
const { getLevel, canUse, err } = require('./mod-utils');

const CATEGORIES = [
  { name: 'Modération', emoji: '🔨' },
  { name: 'Temporaire', emoji: '⏳' },
];

const cmd = {
  name: 'cmds',
  category: 'Utilitaires',
  usage: 'mod',
  description: 'Liste des commandes disponibles pour votre niveau.',
  perm: null,

  async run(message, args, client) {
    const target = (args.find((a) => a.toLowerCase() !== 'show') || '').toLowerCase();

    if (target !== 'mod') {
      return message.reply({ embeds: [err(`Usage : \`${config.prefix}cmds mod\``)] });
    }
    const level = getLevel(message.member);
    if (level <= 0) {
      return message.reply({ embeds: [err("Tu n'as pas la permission « Mod ».")] });
    }

    // Commandes que ce membre peut utiliser (les alias pointent vers le même objet)
    const commands = [...new Set(client.commands.values())].filter((c) => canUse(message.member, c.name));

    let description = `Niveau : \`${level}\`\nPréfixe : \`${config.prefix}\`\n`;

    for (const { name, emoji } of CATEGORIES) {
      const lines = commands
        .filter((c) => c.category === name)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => `\`${config.prefix}${c.name}${c.usage ? ` ${c.usage}` : ''}\` — ${c.description}`);

      if (lines.length) description += `\n**${emoji} ${name}**\n${lines.join('\n')}\n`;
    }

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle('📖 Commandes accessibles avec la permission "Mod"')
      .setDescription(description);

    if (config.cmdsInDM) {
      const sent = await message.author.send({ embeds: [embed] }).catch(() => null);
      if (sent) return message.react('📬').catch(() => {});
    }
    message.reply({ embeds: [embed] });
  },
};

    return cmd;
  })(),
);

module.exports = commands;
