var ChannelId = [
'TF1','France 2','France 3','Canal+','France 5','M6','Arte','C8','W9','TMC',
'NT1','NRJ 12',,'France 4','BFM TV','itele','CStar','Gulli','France Ô','HD1',
'L\'Equipe 21','6ter','Numéro 23','RMC Découverte','BFM TV','Paris Première','Téva',,'RTL 9',,
,,,'Eurosport 1','Eurosport 2',,,,'AB 1',,
,,,,,,,,,,
,,,,,,,'Paramount Channel','Planete+','National Geographic',
'Nat Geo Wild','Voyage',,,,,,,,,
'TV Breizh',,,,,,,,'TV5 Monde',,
,'Syfy',,,,,,,,,
,,,,,,,,,,
,,,,,,,,,,
,,,,,,,,,,
,,,,,,,,,,
,,,,,,,,,,
,,,,,,,,,,
,,,,,,,,,,
,,,,,,,,,,
,,,,'AB Moteurs',,,,,,
,,,,,,,,,,
,,,,,,,,,,
,,'Discovery Science',,'Histoire','Toute l\'histoire','Science & Vie TV',,,
];


exports.ChannelId = function(title){ var pos = ChannelId.indexOf(title); return ((pos != -1) ? pos + 1 : pos)}