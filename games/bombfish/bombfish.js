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
	$(document).bind("keydown", function (ev) {
		var cas = (ev.ctrlKey ? "c" : "") + (ev.altKey ? "a" : "") + (ev.shiftKey ? "s" : "")
		switch(cas + ev.keyCode){
			// Gameplay
			case "37": pushCatQueue("left"); break;
			case "38": pushCatQueue("up"); break;
			case "39": pushCatQueue("right"); break;
			case "40": pushCatQueue("down"); break;

			// r
			case "82": restartLevel();

			// Editor
			// 1 2 3 4 5 6 7 8 9 0
			case "49": selectPiece("S"); break;
			case "50": selectPiece("G"); break;
			case "51": selectPiece("R"); break;
			case "52": selectPiece("T"); break;
			case "53": selectPiece("B"); break;
			case "54": selectPiece("C"); break;
			case "55": selectPiece("F"); break;
			case "56": selectTool(1); break;
			case "57": selectTool(2); break;
			case "48": selectTool(3); break;

			// ctrl+z ctrl+r
			case "c90": undoChange(); break;
			case "c82": redoChange(); break;
		}
	});
});

function loadLevel(name, data) {
	/* Load level contents from string.
	 * String is of form /(T\d*)+/ where T is one of the following:
	 *  G or a space: Grass (empty) tile.
	 *  S: Start (cat); F: Fish/Finish
	 *  R: Rock
	 *  T: Tree; B: Box; C: Drum
	 */
	if (winningAnimationTimer) clearTimeout(winningAnimationTimer);

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
			var x = i % 16, y = Math.floor(i / 16);
			setObject("cat", x, y);
			$(".bf-cat").data({
				"orig-x": x,
				"orig-y": y,
			});
		}
	});

	// Set name.
	if ($(".bf-regular").is(":visible")) {
		$(".bf-regular-name").text(name);
	} else {
		$(".bf-custom-name").val(name);
	}

	beatLevel = false;
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
		"duration": animate ? 150 : 0,
		"complete": animate || $.noop,
	}).data({
		"x": x, "y": y,
	});
}

function moveObject($obj, fromX, fromY, toX, toY) {
	// Set initial position of .bf-movable and give tile image
	setObject("movable", fromX, fromY);
	// Change tile to grass
	var cls = whatTile($obj);
	resetTile($obj, "bf-grass");
	// Animate movement.
	resetTile($(".bf-movable"), cls);
	setObject("movable", toX, toY, function () {
		var leftTile = whatTile(toX-1, toY);
		var upTile = whatTile(toX, toY-1);
		var rightTile = whatTile(toX+1, toY);
		var downTile = whatTile(toX, toY+1);
		if ([leftTile, upTile, rightTile, downTile].indexOf("bf-rock") != -1) {
			// Change to rock.
			cls = "bf-rock";
		} else {
			var destroyed = false;
			if (leftTile == cls) destroyed = resetTile(getTile(toX-1, toY), "bf-grass");
			if (upTile == cls) destroyed = resetTile(getTile(toX, toY-1), "bf-grass");
			if (rightTile == cls) destroyed = resetTile(getTile(toX+1, toY), "bf-grass");
			if (downTile == cls) destroyed = resetTile(getTile(toX, toY+1), "bf-grass");
			if (destroyed) cls = "bf-grass";
		}
		// Change new tile to target.
		resetTile(getTile(toX, toY), cls);
		// Clear movable's image
		resetTile($(".bf-movable"), false);
	});
}

function resetTile($obj, cls) {
	// Reset image.
	$obj.removeClass("bf-grass bf-fish bf-tree bf-box bf-drum bf-rock");
	if (cls !== false) $obj.addClass(cls || $obj.data("orig"));
	return $obj;
}

function whatTile($obj, y) {
	if (typeof(y) !== "undefined") {
		var x = $obj;
		if (outBounds(x, y)) {
			// Borders have no class.
			return "";
		}
		$obj = getTile(x, y);
	}
	// Get tile class.
	return $obj.attr("class").replace(/\bbf-tile\b| /g, "");
}

function outBounds(x, y) { return x < 0 || x >= 16 || y < 0 || y >= 11; }
function getTile(x, y) { return $(".bf-tile:eq(" + (y * 16 + x) + ")"); }
function isSolid($t) { return $t.is(".bf-fish, .bf-tree, .bf-box, .bf-drum, .bf-rock"); }
function isMovable($t) { return $t.is(".bf-tree, .bf-box, .bf-drum"); }

function moveCat(nextX, nextY, furtherX, furtherY) {
	// Move cat to next, move whatever's in next to further.
	if (outBounds(nextX, nextY)) {
		// Can't move out of bounds.
		return;
	}

	// Find what's in next, if anything.
	var $next = getTile(nextX, nextY);
	if (isSolid($next)) {
		if (!isMovable($next)) {
			// Cannot move this.
			return;
		}

		// If it's solid, it has to move, so we have to check further.
		if (outBounds(furtherX, furtherY)) {
			// Can't move out of bounds.
			return;
		}

		var $further = getTile(furtherX, furtherY);
		if (isSolid($further)) {
			// Can't move this block.
			return;
		}

		moveObject($next, nextX, nextY, furtherX, furtherY);
	}
	// If it's not solid (empty), the cat can just move here.
	// Otherwise, the object in the way has already moved by this point.
	setObject("cat", nextX, nextY, popCatQueue);
}

var catQueue = [];
function popCatQueue() {
	// Don't move if we've won.
	var x = $(".bf-cat").data("x");
	var y = $(".bf-cat").data("y");
	if ([
		whatTile(x-1, y), whatTile(x, y-1),
		whatTile(x+1, y), whatTile(x, y+1)
	].indexOf("bf-fish") != -1) {
		catQueue = [];
		playerWins();
	}

	if (catQueue.length) {
		var next = catQueue.shift();
		if (!$(".bf-cat").is(":animated")) {
			var x = $(".bf-cat").data("x"), y = $(".bf-cat").data("y");
			switch(next) {
				case "left":  moveCat(x-1, y,   x-2, y  ); break;
				case "up":    moveCat(x,   y-1, x,   y-2); break;
				case "right": moveCat(x+1, y,   x+2, y  ); break;
				case "down":  moveCat(x,   y+1, x,   y+2); break;
			}
		}
	}
}

function pushCatQueue(direction) {
	// No more movement if level is beaten.
	if (beatLevel) return;

	catQueue.push(direction);
	if (!$(".bf-cat").is(":animated") && catQueue.length == 1) {
		popCatQueue();
	}
}

function queueCat(direction) {
	return function () { pushCatQueue(direction); }
}

function restartLevel() {
	if (winningAnimationTimer) clearTimeout(winningAnimationTimer);

	$(".bf-tile").each(function () {
		resetTile($(this));
	});

	var x = $(".bf-cat").data("orig-x");
	var y = $(".bf-cat").data("orig-y");
	setObject("cat", x, y);

	beatLevel = false;
}

var beatLevel = false, winningAnimationTimer = null;
function playerWins() {
	beatLevel = true;
	// Winning animations. TODO: Cat's animations.
	$fish = $(".bf-fish").removeClass("bf-fish");

	function nextAnim(id) {
		// Set next frame.
		$fish.addClass("bf-exp" + id);

		// Timer for next frame.
		winningAnimationTimer = setTimeout(function () {
			// Remove that frame's class.
			$fish.removeClass("bf-exp" + id);
			if (id < 6) {
				// Set the next if there's more left.
				nextAnim(id + 1);
			}
		}, 144);
	}
	nextAnim(0);
}


//////// Editor Code /////////
function toolTile() {
	// Exercise tool on $this tile.
}

function selectPiece(piece) {

}

function selectTool(tool) {

}

function undoChange() {

}

function redoChange() {

}