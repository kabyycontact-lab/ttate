module.exports = {
  // Préfixe des commandes
  prefix: '+',

  // Rôles du staff, du plus bas au plus haut.
  // Un rôle plus haut hérite de tous les droits des rôles plus bas.
  // Le nom est comparé sans les symboles (・, emojis…), sans accents et sans majuscules,
  // donc "・Modérateur" correspond à "Modérateur". Tu peux aussi ajouter `id: '123…'`
  // (ID du rôle) pour être sûr à 100 %.
  staffRoles: [
    { name: '・Helper', level: 20 },
    { name: '・Modérateur', level: 40 },
    { name: '・Chef Modérateur', level: 60 },
    { name: '・Responsable Staff', level: 100 },
  ],

  // Niveau minimum requis pour chaque commande.
  // Une commande absente de cette liste est utilisable par tout le monde.
  commandLevels: {
    // ・Helper
    warn: 20,

    // ・Modérateur
    mute: 40,
    unmute: 40,
    unwarn: 40,

    // ・Chef Modérateur
    lock: 60,
    unlock: 60,
    slowmode: 60,

    // ・Responsable Staff (tout le reste)
    tempmute: 100,
    kick: 100,
    ban: 100,
    unban: 100,
    tempban: 100,
    clear: 100,
  },

  // Niveau minimum pour voir les warns des AUTRES membres (+warnlist @membre).
  // Tout le monde peut voir ses propres warns avec +warnlist.
  warnlistOthersLevel: 20,

  // Le propriétaire du serveur et les membres avec la permission Administrateur
  // ont automatiquement le niveau maximum.
  adminsBypass: true,

  // true = +cmds est envoyé en message privé, false = dans le salon
  cmdsInDM: false,

  // Couleur des embeds (+cmds)
  embedColor: 0x2b2d31,
};
