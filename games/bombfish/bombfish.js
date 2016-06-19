$(function () {
	// Create field.
	var $tile = $("<span>").addClass("bf-tile").addClass("bf-grass");
	var $field = $(".bf-field");
	for (var y = 0; y < 11; ++y) {
		for (var x = 0; x < 16; ++x) {
			$tile.clone().appendTo($field).click(toolTile);
		}
	}

	// Populate level selection.
	var $levelButton = $("<span>").addClass("bf-level-button");
	var $levelSelect = $(".bf-level-select");
	for (var i = 0; i < BF_Levels.length; i++) {
	 	$levelButton.clone().text(i + 1).appendTo($levelSelect).click(selectLevel);
	}

	// Register key presses.
	$(".bombfish")
	// Gameplay
	.bind("keyup", "up",    queueCat("up"))
	.bind("keyup", "right", queueCat("right"))
	.bind("keyup", "left",  queueCat("left"))
	.bind("keyup", "down",  queueCat("down"))

	.bind("keyup", "r", restartLevel)

	// Editor
	.bind("keyup", "1", selectPiece("S"))
	.bind("keyup", "2", selectPiece("G"))
	.bind("keyup", "3", selectPiece("R"))
	.bind("keyup", "4", selectPiece("T"))
	.bind("keyup", "5", selectPiece("B"))
	.bind("keyup", "6", selectPiece("C"))
	.bind("keyup", "7", selectPiece("F"))
	.bind("keyup", "8", selectTool(1))
	.bind("keyup", "9", selectTool(2))
	.bind("keyup", "0", selectTool(3))

	.bind("keyup", "ctrl+z", undoChange)
	.bind("keyup", "ctrl+r", redoChange)
});

function loadLevel(name, data) {
	/* Load level contents from string.
	 * String is of form /(T\d*)+/ where T is one of the following:
	 *  G or a space: Grass (empty) tile.
	 *  S: Start (cat); F: Fish/Finish
	 *  R: Rock
	 *  T: Tree; B: Box; C: Drum
	 */
	// Expand and normalize all tiles.
	data = data
	.replace(/ /g, "G")
	.replace(/([GSFRTBC])(\d+)/g, function (_, tile, count) {
		return tile.repeat(parseInt(count));
	});

	// Verify data.
	if (!data.match(/^[GSFRTBC]{176}$/)
	|| data.match(/S/g).length != 1
	|| data.match(/F/g).length != 1) {
		console.error("Bombfish Error: Bad level data.");
		return;
	}

	// Draw up tiles.
	var assoc = {
		"G": "bf-grass", "S": "bf-grass", "F": "bf-fish",
		"T": "bf-tree",  "B": "bf-box",   "C": "bf-drum",
		"R": "bf-rock",
	};

	$(".bf-tile").each(function (i) {
		var tile = data.charAt(i);
		var $this = resetTile($(this).data("orig", assoc[tile]));

		if (tile == "S") {
			// Move cat to start position.
			setObject("cat", i % 16, Math.floor(i / 16));
		}
	});

	// Set name.
	if ($(".bf-regular").is(":visible")) {
		$(".bf-regular-name").text(name);
	} else {
		$(".bf-custom-name").val(name);
	}
}

function selectLevel() {
	// Triggered by level selection.
	var levelNumber = parseInt($(this).text());

	if ((levelNumber - 1) in BF_Levels) {
		loadLevel("Level #" + levelNumber, BF_Levels[levelNumber - 1]);
	} else {
		console.error("Bombfish Error: Level number is invalid.");
	}
}


//////// Control Code ////////
function setObject(obj, x, y, animate) {
	return $(".bf-" + obj).animate({
		"top": y * 16,
		"left": x * 16,
	}, {
		"duration": animate ? 200 : 0,
		"complete": animate || $.noop,
	}).data({
		"x": x, "y": y,
	});
}

function moveObject($obj, fromX, fromY, toX, toY) {
	// TODO: Set initial position of .bf-movable and give tile image
	// TODO: Change tile to grass
	setObject("movable", toX, toY, function () {
		// TODO: Change new tile to target.
		// TODO: Clear movable's image
	});
}

function resetTile($obj) {
	// Reset image.
	return $obj.removeClass("bf-grass bf-fish bf-tree bf-box bf-drum bf-rock").addClass($obj.data("orig"));
}

function outBounds(x, y) { return x < 0 || x >= 16 || y < 0 || y >= 11; }
function getTile(x, y) { return $(".bf-tile:eq(" + (y * 16 + x) + ")"); }
function isSolid($t) { return $t.is(".bf-fish, .bf-tree, .bf-box, .bf-drum, .bf-rock"); }
function isMovable($t) { return t.is(".bf-tree, .bf-box, .bf-drum"); }

function moveCat(nextX, nextY, furtherX, furtherY) {
	// Move cat to next, move whatever's in next to further.
	if (outBounds(nextX, nextY)) {
		// Can't move out of bounds.
		return false;
	}

	// Find what's in next, if anything.
	var $next = getTile(nextX, nextY);
	if (isSolid($next)) {
		if (!isMovable($next)) {
			// Cannot move this.
			return false;
		}

		// If it's solid, it has to move, so we have to check further.
		if (outBounds(furtherX, furtherY)) {
			// Can't move out of bounds.
			return false;
		}

		var $further = getTile(furtherX, furtherY);
		if (isSolid($further)) {
			// Can't move this block.
			return false;
		}

		moveObject($next, furtherX, furtherY);
	}
	// If it's not solid (empty), the cat can just move here.
	// Otherwise, the object in the way has already moved by this point.
	setObject("cat", nextX, nextY, popCatQueue);

	return true;
}

function popCatQueue() {

}

function pushCatQueue() {

}

function queueCat(direction) {
	return function () { pushCatQueue(direction); }
}

function restartLevel() {

}

function selectPiece(piece) {
	return function () {

	}
}

function selectTool(tool) {
	return function () {

	}
}

function undoChange() {

}

function redoChange() {

}


//////// Editor Code /////////
function toolTile() {
	// Exercise tool on $this tile.
}