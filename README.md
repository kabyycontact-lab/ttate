# Bot de modération Discord

Bot en **discord.js v14** (Node.js 18+), préfixe `+`.

## Installation

1. Crée une application sur https://discord.com/developers/applications, ajoute un bot et copie son **token**.
2. Dans l'onglet **Bot**, active les 2 intents privilégiés : **Server Members Intent** et **Message Content Intent**.
3. Invite le bot avec les permissions : *Ban Members, Kick Members, Moderate Members, Manage Roles, Manage Channels, Manage Messages* (ou Administrateur).
4. Dans le serveur, place le rôle du bot **au-dessus** des rôles des membres à sanctionner.
5. Dans le dossier du projet :

```bash
npm install
cp .env.example .env     # puis colle ton token dans .env
npm start
```

## Commandes

| Commande | Rôle |
|---|---|
| `+ban <user/id> [raison]` | Bannir |
| `+unban <user/id> [raison]` | Débannir |
| `+kick <user/id> [raison]` | Expulser |
| `+mute <user/id> [raison]` | Sourdine par rôle (sauvegarde et retire tous les rôles) |
| `+unmute <user/id>` | Retire la sourdine (rôle ou timeout) et restaure les rôles |
| `+warn <user/id> [raison]` | Avertir |
| `+unwarn <user/id> <n°\|all>` | Supprimer un ou tous les warns (alias `+rwarn`) |
| `+warnlist [user/id]` | Voir les warns (les siens sans argument) |
| `+slowmode <durée\|off> [raison]` | Slowmode du salon (`10`, `30s`, `5m`, `1h`, `off`) |
| `+lock [#salon\|id]` / `+unlock [#salon\|id]` | Verrouiller / déverrouiller un salon |
| `+clear <nombre>` | Supprimer des messages (1 à 1000) |
| `+tempban <user/id> <durée> [raison]` | Ban temporaire (débannissement automatique) |
| `+tempmute <user/id> <durée> [raison]` | Timeout Discord natif (max 28 jours) |
| `+cmds mod` | Liste des commandes de modération |

Durées : `30s`, `10m`, `2h`, `1d`, `2w`.

## Configuration

Dans `config.js` :
- `prefix` : préfixe des commandes
- `modRoleIds` : IDs de rôles « Mod » (en plus des permissions Discord)
- `cmdsInDM` : `true` pour recevoir `+cmds` en message privé

Les warns et sanctions temporaires sont enregistrés dans `data/db.json`.
