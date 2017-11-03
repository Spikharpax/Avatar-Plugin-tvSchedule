tvSchedule
===========

Ce plugin est un ajout pour le framework [Avatar](https://github.com/Spikharpax/Avatar-Serveur) 

Il permet de demander à Avatar le programme tv:
- Du moment
- En première partie de soirée
- En deuxième partie de soirée
- Par tranche de 2 heures
- Pour un jour de la semaine par tranche de 2 heures
- Classement par type de programmes:
	- Avatar vous énnumère les programmes trouvés par le type que vous lui demandez
- Demandez à Avatar de vous mettre le programme lorsqu'il passe et il changera de chaine automatiquement
- Fonction enregistrement, si un programme favori passe, à n'importe quelle heure et sur n'importe quelle chaine:
	- Si la freebox est éteinte, Avatar l'enregistrera automatiquement
	- Si la freebox est allumée, Avatar vous le proposera
		- Vous pouvez aussi l'enregistrer
- Sélection et filtrage des chaines que vous voulez


## Hautement conseillé sur mon github
- Plugin 'scenariz'
	- Pour le rappel des programmes favoris.
- Plugin 'freebox'
	- Pour permettre de changer de chaine si un programme favori passe ou pour l'enregistrer.
	- Si vous n'avez pas ce plugin, vous pouvez soit:
		- Modifier les fonctions qui correspondent pour intégrer votre box tv ou ignorer/supprimer les commandes associées.


## Installation
- Dézippez le fichier `Avatar-Plugin-tvSchedule-Master.zip` dans un répertoire temporaire
- Copiez le répertoire `tvSchedule` dans le répertoire `Avatar-Serveur/plugins`

## Configuration

### Liste complète des chaines TV
Toutes les chaines sont définies dans le fichier `Avatar-Serveur/plugins/tvSchedule/tvChannels.js` et sert à tvSchedule pour savoir quelles chaines sont à récupérer.

Le nom des chaines est à ajouter/modifier à la position exacte qui correspond dans la liste des chaines de la box Free.
**Attention**:
- A écrire le nom exact de la chaine
- De respecter la position. Comptez les champs du tableau pour trouver la position où ajouter une nouvelle chaine. Si une ligne commence avec une virgule,  comptez +1 avant la virgule.

### Les chaines triées
Les chaines dont Avatar vous donne les programmes sont définies dans le fichier `Avatar-Serveur/plugins/tvSchedule/tvSchedule.prop` dans le tableau `MyChannelId`

```xml
"MyChannelId" : [
"TF1","France 2","France 3","Arte","M6","France 5","C8","W9","TMC",
"NT1","NRJ 12","France 4","RMC Découverte","RTL 9","CStar",
"AB Moteurs","National Geographic","Paramount Channel","Voyage","TV5 Monde","Nat Geo Wild",
"Discovery Science","Histoire","Toute l'histoire","Science & Vie TV","Syfy","AB 1",
"Eurosport 1","Eurosport 2"],
```		

Il n'y a pas d'ordres dans ce tableau, ajoutez les chaines à la suite des autres.


## Les commandes
Les règles sont définies dans les tableaux suivants:
- "rules" : Toutes les commandes du plugin tvSchedule (en Anglais)
- "periods" : Les périodes de récupération des programmes TV (en Français)


### Programmes TV
Pour récupérer les programmes TV, la syntaxe est:
- **what is** ... **tv|television** ... **[un jour du tableau "jours"]** ... **[une période du tableau "periods"]**

Une période ou un jour n'est pas obligatoire, si rien n'est défini, le plugin retourne les programmes du moment.

Le **"what is"** peut être traduit de nombreuses façons en Français . Voici quelques exemples de ce que l'on peut dire:

- Qu'est ce qu'il y a à la télévision
- il y a quoi à la télévision aujourd'hui
- Qu'est ce qu'il y a à la tv en ce moment
- Il y a quoi à la télévision ce soir
- Quels sont les programmes à la télévision ce soir
- Donne-moi ce qu'il y a à la télévision ce soir
- Tu peux me dire quel est le programme à la tv ce soir
- Il y a quoi à la télévision en deuxième partie de soirée
- Qu'est ce qu'il y a à la télévision de 22h à minuit
- Dis-nous ce qu'il y a à la télévision de 10h à midi
- Qu'est ce qu'il y a à la télévision mardi de 14h à 16h

### Jeux de questions/réponses du programme télé
Toutes les réponses aux questions sont disponibles dans plusieurs objets du fichier de propriétés.

Après la recherche:
- tvSchedule vous demande un type de programme pour qu'il vous énumère ce qu'il a trouvé.
	- Vous avez toutes les réponses et les types de programmes possibles dans l'objet "askTVType".
	- Par exemple, vous pouvez dire: "le cinéma", tvSchedule vous donnera alors tous les programmes de cinéma qu'il a trouvé.
- Comme réponse vous pouvez dire une réponse de l'objet "askTVProgs".
	-  Par exemple, vous pouvez dire: **"passe au suivant"** ou encore **"donne-moi le résumé"**
	- Les commandes liées au plugin freebox:
		- **"enregistre-le"**: pour enregistrer le programme
		- **"met-le"**: pour changer la chaine courante et mettre le programme
	- Les commandes liées au plugin scenariz et freebox:
		- **"programme-le"**: Ajoute un scénario qui vous avertira lorsque le programme passe.
			- Par exemple,vous etes en train de demander les programmes du soir et vous lui demandez de programmer le film "Avatar" sur TF1.
			- Lorsque l'heure arrivera, tvSchedule vous dira tout seul:
				- "Il est 20h50, tu m'as demandé de mettre Avatar" et changera la chaine de la freebox sur TF1.
				- Le scénario est détruit automatiquement ensuite des scénarios du plugin scenariz.
			- Si le programme est déjà démarrré, tvSchedule vous le notifie, répondez alors une réponse de "recordAlreadyStarted"
		- **"rappelle-le moi"**: Ajoute ce programme dans vos favoris et lorsqu'il passera de nouveau, Avatar vous le signifiera si la télé est allumée. Si elle est éteinte, il l'enregistrera automatiquement.
			- Les commandes associées sont dans l'objet "askSetProgramTV"
			- Par exemple, Avatar vous dira tout seul "J'ai trouvé un programme intéressant, Genius sur National géographic, veux-tu que je le mette ?"
			- Dites alors:
				- **"Oui, s'il te plait"** => plugin freebox nécessaire
				- **"non merci"** => Si vous ne voulez pas changer de chaine ou si vous n'avez pas le plugin freebox
		

### Connaitre les programmes qui ont été enregistrés
**Note**:
- Cette commande nécessite le plugin Freebox.
- Nécessite d'avoir utilisé la commande "rappelle-le moi" pour ajouter le programme à vos rappels de programmes.

Elle vous permet de savoir quels sont les programmes qui ont été enregistrés en votre absence.

Syntaxe:
- **record** ... **programs|program**

Exemple:
- Tu as enregistré des programmes ?
- Dis-moi si tu as enregistré des programmes ?
- Il y a des programmes d'enregistré ?

Le plugin vous énumère dans l'ordre des jours d'enregistrement ce qu'il a enregistré.


### Supprimer les rappels de programmes
Pour supprimer des rappels de programmes passés par la commande "rappelle-le moi", vous pouvez utiliser la commande suivante.

Syntaxe:
- **remove** ... **programs|program**

Commande:
- Supprime des programmes

Vous entrez alors dans un jeu de questions/réponses ou le plugin vous liste vos rappels et vous demande si il faut les supprimer ou non.

Retrouvez ce que vous pouvez dire dans l'objet "askRemoveProgs" du fichier de propriétés.



## A savoir
Les tts vocalisés par Avatar sont disponibles dans le fichier  `Avatar-Serveur/plugins/tvSchedule/lang/FR_fr.js`. Vous pouvez les modifier comme vous voulez.

Le rappel des programmes est vocalisé dans la pièce courante et le client Avatar associé. Si vous avez plusieurs télévisions, par exemple une dans le salon et une autre dans une chambre, Avatar se sert de la variable `Avatar.currentRoom` pour trouver la pièce où il doit faire son rappel.

   
## Versions
Version 1.1 (03-11-2017)
- Les fichiers intent et action déplacés dans le répertoire du plugin. Chargés automatiquement (Avatar serveur 0.1.5)

Version 1.0 
- Version Released
