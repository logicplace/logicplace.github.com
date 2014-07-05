var SUPERSOFT=0, VERYSOFT=1, SOFT=2, HARD=3, VERYHARD=4, SUPERHARD=5;
var Firm=new Array("Super soft", "Very soft", "Soft", "Hard", "Very hard", "Super hard");
var berries=[
	//First row: Informative | Name, Size, Firm, Hours per stage, Harvest min, Harvest max, Powder Amt
	//Second row: Description
	//Third row: Effect, Note
	//Fourth row: NPCs use.. | Mister, Laddie, Lassie, Blend Master
	//Final row: Technical   | Bitter, Spicy, Dry, Sweet, Sour, Smooth, Index
	//Berry images are icon/#b1.gif icon/#b2.png
	//Plant images are icon/#p1.gif icon/#p2.gif icon/#p3.gif
	//for growing, blooming, and complete
	//Mound and sprout images can be icon/p0.gif and icon/p1.gif
	["None",0,0,0,0,0,0,"","","",0,0,0,"",0,0,0,0,0,0,0],
	["Cheri",2.0,SOFT,3,2,3,20,
	"Blooms with delicate pretty flowers.|The bright red BERRY is very spicy.",
	"A hold item that heals paralysis in battle.","",
	5,4,3,"",
	0,1,0,0,-1,25,1],
	["Chesto",8.0,SUPERHARD,3,2,3,20,
	"The BERRY's thick skin and fruit are very tough. It is dry-tasting all over.",
	"A hold item that awakens POKéMON in battle.","",
	1,5,4,"",
	0,-1,1,0,0,25,2],
	["Pecha",4.0,VERYSOFT,3,2,3,20,
	"Very sweet and delicious.|Also very tender - handle with care.",
	"A hold item that heals poisoning in battle.","",
	2,1,5,"",
	0,0,-1,1,0,25,3],
	["Rawst",3.2,HARD,3,2,3,20,
	"If the leaves grow long and curly,|the berry seems to grow very bitter.",
	"A hold item that heals a burn in battle.","",
	3,2,1,"",
	1,0,0,-1,0,25,4],
	["Aspear",5.0,SUPERHARD,3,2,3,20,
	"The hard BERRY is dense with a rich juice. It is quite sour.",
	"A hold item that defrosts POKéMON in battle.","",
	4,3,2,"",
	-1,0,0,0,1,25,5],
	["Leppa",2.8,VERYHARD,4,2,3,30,
	"Grows slower than CHERI and others.|The smaller the berry, the tastier.",
	"A hold item that restores 10 PP in battle.","",
	1,3,4,"",
	0,1,-1,0,0,20,6],
	["Oran",3.5,SUPERHARD,3,2,3,30,
	"A peculiar BERRY with a mix of flavors. BERRIES grow in half a day.",
	"A hold item that restores 10 HP in battle.","",
	2,4,5,"",
	0,0,0,0,0,20,7],
	["Persim",4.7,HARD,3,2,3,30,
	"Loves sunlight. The BERRY's color|grows vivid when exposed to the sun.",
	"A hold item that heals confusion in battle.","",
	3,5,1,"",
	0,0,0,0,0,20,8],
	["Lum",3.4,SUPERHARD,12,1,2,30,
	"Slow to grow. If raised with loving care it may grow two BERRIES.",
	"A hold item that heals status in battle.","",
	4,1,2,"",
	0,0,0,0,0,20,9],
	["Sitrus",9.5,VERYHARD,6,2,3,30,
	"Closely related to ORAN. The large BERRY has a well-rounded flavor.",
	"A hold item that restores 30 HP in battle.","",
	5,2,3,"",
	0,0,0,0,0,20,10],
	["Figy",10.0,SOFT,6,2,3,50,
	"The BERRY, which looks chewed up, brims with spicy substances.",
	"A hold item that restores HP but may confuse if Pokémon dislikes Spicy.","",
	1,3,4,"",
	0,1,0,0,-1,25,11],
	["Wiki",11.5,HARD,6,2,3,50,
	"The BERRY is said to have grown lumpy to help POKéMON grip it.",
	"A hold item that restores HP but may confuse if Pokémon dislikes Dry.","",
	2,4,5,"",
	0,-1,1,0,0,25,12],
	["Mago",12.6,HARD,6,2,3,50,
	"The BERRY turns curvy as it grows.|The curvier, the sweeter and tastier.",
	"A hold item that restores HP but may confuse if Pokémon dislikes Sweet","",
	3,5,1,"",
	0,0,-1,1,0,25,13],
	["Aguav",6.4,SUPERHARD,6,2,3,50,
	"The flower is dainty. It is rare in its ability to grow without light.",
	"A hold item that restores HP but may confuse if Pokémon dislikes Bitter","",
	4,1,2,"",
	1,0,0,-1,0,25,14],
	["Iapapa",22.3,SOFT,6,2,3,50,
	"The BERRY is very big and sour.|It takes at least a day to grow.",
	"A hold item that restores HP but may confuse if Pokémon dislikes Sour","",
	5,2,3,"",
	-1,0,0,0,1,25,15],
	["Razz",12.0,VERYHARD,1,3,6,70,
	"The red BERRY tastes slightly spicy.|It grows quickly in just four hours.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	1,3,4,"",
	0,0,1,0,-1,20,16],
	["Bluk",10.8,SOFT,1,3,6,70,
	"The BERRY is blue on the outside, but it blackens the mouth when eaten.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	2,4,5,"",
	0,-1,0,1,0,20,17],
	["Nanab",7.7,VERYHARD,1,3,6,70,
	"This BERRY was the seventh|discovered in the world. It is sweet.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	3,5,1,"",
	1,0,-1,0,0,20,18],
	["Wepear",7.4,SUPERHARD,1,3,6,70,
	"The flower is small and white. It has a delicate balance of bitter and sour.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	4,1,2,"",
	0,0,0,-1,1,20,19],
	["Pinap",8.0,HARD,1,3,6,70,
	"Weak against wind and cold.|The fruit is spicy and the skin, sour.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	5,2,4,"",
	-1,1,0,0,0,20,20],
	["Pomeg",13.5,VERYHARD,3,2,6,100,
	"However much it is watered|it only grows up to six BERRIES.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.\nEmerald: Lowers HP Effort Values by 10","",
	1,3,4,"",
	1,1,-1,0,-1,20,21],
	["Kelpsy",15.0,HARD,3,2,6,100,
	"A rare variety shaped like a root. Grows a large flower.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.\nEmerald: Lowers Attack Effort Values by 10","",
	2,4,5,"",
	0,-1,1,-1,1,20,22],
	["Qualot",11.0,HARD,3,2,6,100,
	"Loves water. Grows strong even in locations with constant rainfall.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.\nEmerald: Lowers Defense Effort Values by 10","",
	3,5,1,"",
	-1,1,-1,1,0,20,23],
	["Hondew",16.2,HARD,3,2,6,100,
	"A BERRY that is very valuable and rarely seen. It is very delicious.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.\nEmerald: Lowers Special Attack Effort Values by 10","",
	4,1,2,"",
	1,0,1,-1,-1,20,24],
	["Grepa",14.9,SOFT,3,2,6,100,
	"Despite its tenderness and round shape, the BERRY is unimaginably sour.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.\nEmerald: Lowers Special Defense Effort Values by 10","",
	5,2,3,"",
	-1,-1,0,1,1,20,25],
	["Tamato",20.0,SOFT,6,2,4,150,
	"The BERRY is lip-bendingly spicy. It takes time to grow.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.\nEmerald: Lowers Speed Effort Values by 10","",
	1,3,4,"",
	0,1,1,0,-2,30,26],
	["Cornn",7.5,HARD,6,2,4,150,
	"A BERRY from an ancient era. May not grow unless planted in quantity.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	2,4,5,"",
	0,-2,1,1,0,30,27],
	["Magost",14.0,HARD,6,2,4,150,
	"A BERRY that is widely said to have a finely balanced flavor.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	3,5,1,"",
	1,0,-2,1,0,30,28],
	["Rabuta",14.0,SOFT,6,2,4,150,
	"A rare variety that is overgrown with hair. It is quite bitter.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	4,1,2,"",
	1,0,0,-2,1,30,29],
	["Nomel",28.4,SUPERHARD,6,2,4,150,
	"Quite sour. Just one bite makes it impossible to taste for three days.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	5,2,3,"",
	-2,1,0,0,1,30,30],
	["Spelon",13.3,SOFT,18,1,2,250,
	"The vividly red BERRY is very spicy.|Its warts secrete a spicy substance.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	1,3,4,"",
	0,3,1,0,-4,30,31],
	["Pamtre",14.4,VERYSOFT,18,1,2,250,
	"Drifts on the sea from somewhere. It is thought to grow elsewhere.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	2,4,5,"",
	0,-4,3,1,0,30,32],
	["Watmel",25.0,SOFT,18,1,2,250,
	"A huge BERRY,with some over 20 inches discovered. Exceedingly sweet.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	3,5,1,"",
	1,0,-4,3,0,30,33],
	["Durin",27.9,HARD,18,1,2,250,
	"Bitter to even look at. It is so bitter, no one has ever eaten it as is.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	4,1,2,"",
	3,0,0,-4,1,30,34],
	["Belue",29.9,VERYSOFT,18,1,2,250,
	"It is glossy and looks delicious, but it is awfully sour. Takes time to grow.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	5,2,3,"",
	-4,1,0,0,3,30,35],
	["Liechi",11.1,VERYHARD,24,1,2,500,
	"A mysterious BERRY. It is rumored to contain the power of the sea.",
	"A hold item that raises ATTACK in a pinch.","",
	1,3,4,"",
	-1,4,-4,4,-3,80,36],
	["Ganlon",3.3,VERYHARD,24,1,2,500,
	"A mysterious BERRY. It is rumored to contain the power of the land.",
	"A hold item that raises DEFENSE in a pinch.","",
	2,4,5,"",
	-1,4,-4,4,-3,80,37],
	["Salac",9.5,VERYHARD,24,1,2,500,
	"A mysterious BERRY. It is rumored to contain the power of the sky.",
	"A hold item that raises SPEED in a pinch.","",
	3,5,1,"",
	-4,0,-4,4,4,80,38],
	["Petaya",23.7,VERYHARD,24,1,2,500,
	"A mysterious BERRY. It is rumored to contain the power of all living things.",
	"A hold item that raises Special Attack in a pinch.","",
	4,1,2,"",
	4,4,0,-4,-4,80,39],
	["Apicot",7.5,HARD,24,1,2,500,
	"A very mystifying BERRY. No telling what may happen or how it can be used.",
	"A hold item that raises Special Defense in a pinch.","",
	5,2,3,"",
	4,4,0,-4,-4,80,40],
	["Lansat",7.5,SOFT,24,1,2,50,
	"Said to be a legendary BERRY. Holding it supposedly brings joy.",
	"A hold item that ups the critical-hit rate in a pinch.","",
	1,3,4,"",
	0,0,0,0,0,30,41],
	["Starf",7.5,SOFT,24,1,2,50,
	"So strong, it was abandoned at the world's edge. Considered a mirage.",
	"A hold item that sharply boosts a stat in a pinch.","",
	2,4,5,"",
	0,0,0,0,0,30,42],
	["Enigma",0.0,SOFT,24,1,2,200,
	"A completely enigmatic BERRY. Appears to have the power of stars.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	1,3,4,"",
	0,0,0,0,0,40,43],
	["Pumkin",4.8,SUPERHARD,18,2,3,0,
	"This BERRY is amazingly sour. It's heavy due to its dense filling.",
	"A hold item that defrosts POKéMON in battle.","",
	"","","","",
	-4,0,0,0,4,65,44],
	["Drash",13.4,VERYHARD,18,2,3,0,
	"When it ripens, this sweet BERRY falls and sticks into the ground.",
	"A hold item that heals poisoning in battle.","",
	"","","","",
	0,0,-4,4,0,65,45],
	["Eggant",4.1,SOFT,18,2,3,0,
	"Very dry tasting, especially the parts not exposed to the sun.",
	"A hold item that snaps POKéMON out of infatuation.","",
	"","","","",
	0,-4,4,0,0,65,46],
	["Strib",12.2,HARD,24,4,12,0,
	"It grows slowly, but abundantly. Makes a soothing sound when shaken.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	"","","","",
	3,3,0,-3,-3,85,47],
	["Chilan",27.2,SOFT,1,1,2,0,
	"This sparse BERRY grows quickly. Its skin is quite tough.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	"","","","",
	0,3,-3,3,-3,85,48],
	["Nutpea",12.4,SUPERHARD,1,1,2,0,
	"This BERRY is rigid and cracks open when the center is squeezed.",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	"","","","",
	0,0,0,0,0,5,49],
	["Ginema",3.5,VERYHARD,14,2,3,0,
	"",
	"A hold item that raises a lowered ability.","",
	"","","","",
	-3,-3,3,0,3,70,50],
	["Kuo",3.5,VERYHARD,14,2,3,0,
	"Five flavors mix deliciously, leaving a rough feeling in the mouth.",
	"A hold item that heals a burn in battle.","",
	"","","","",
	0,0,0,0,0,5,51],
	["Yago",3.6,VERYHARD,18,2,3,0,
	"",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	"","","","",
	-4,0,0,0,4,65,52],
	["Touga",15.3,SUPERHARD,18,2,3,0,
	"",
	"A hold item that heals confusion in battle.","",
	"","","","",
	0,4,0,0,-4,65,53],
	["Niniku",15.3,HARD,18,2,3,0,
	"",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	"","","","",
	3,-3,3,-3,0,85,54],
	["Topo",8.8,VERYHARD,24,4,12,0,
	"",
	"POKéBLOCK ingredient. Plant in loamy soil to grow.","",
	"","","","",
	-3,0,-3,3,3,85,55],
];
