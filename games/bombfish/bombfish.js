$(function () {
	// Create field.
	var $tile = $("<span>").addClass("bf-tile").addClass("bf-grass");
	var $field = $(".bf-field");
	for (var y = 0; y < 11; ++y) {
		for (var x = 0; x < 16; ++x) {
			$tile.clone().data({
				"x": x,
				"y": y,
			}).appendTo($field);
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
			case "49": selectPiece("c"); break;
			case "50": selectPiece("G"); break;
			case "51": selectPiece("R"); break;
			case "52": selectPiece("T"); break;
			case "53": selectPiece("B"); break;
			case "54": selectPiece("C"); break;
			case "55": selectPiece("F"); break;
			case "56": selectTool("paint"); break;
			case "57": selectTool("toggle"); break;
			case "48": selectTool("cycle"); break;

			// ctrl+z ctrl+r
			case "c90":
				undoChange();
				ev.preventDefault();
				break;
			case "c82":
				redoChange();
				ev.preventDefault();
				break;
		}
	});

	// Gameplay controls.
	$(".bf-restart").click(restartLevel);
	$(".bf-solve").click($.noop);
	$(".bf-create").click(showCustom);

	// Level creation controls.
	$(".bf-piece.bf-cat").click(  function () { selectPiece("c"); });
	$(".bf-piece.bf-grass").click(function () { selectPiece("G"); });
	$(".bf-piece.bf-rock").click( function () { selectPiece("R"); });
	$(".bf-piece.bf-tree").click( function () { selectPiece("T"); });
	$(".bf-piece.bf-box").click(  function () { selectPiece("B"); });
	$(".bf-piece.bf-drum").click( function () { selectPiece("C"); });
	$(".bf-piece.bf-fish").click( function () { selectPiece("F"); });

	$(".bf-tool.bf-paint").click( function () { selectTool("paint");  });
	$(".bf-tool.bf-toggle").click(function () { selectTool("toggle"); });
	$(".bf-tool.bf-cycle").click( function () { selectTool("cycle");  });

	$(".bf-undo").click(undoChange);
	$(".bf-redo").click(redoChange);
	$(".bf-save").click(saveLevel);
	$(".bf-load").click(loadSavedLevel);
	//$(".bf-copy-url").click(copyLevelURL);
	$(".bf-play").click(testLevel);
	$(".bf-quit").click(showRegular);

	function setupClipboard() {
		if (typeof(Clipboard) === "undefined") {
			setTimeout(setupClipboard, 50);
		} else {
			new Clipboard(".bf-copy-url", {
			    "text": copyLevelURL
			});
		}
	}
	setupClipboard();

	$(".bf-tile").mousedown(tileMouseDown)
	.mouseenter(tileMouseEnter);
	$(document).mouseup(tileMouseUp);

	window.onhashchange = function () {
		if (location.hash && location.hash.substr(1)) {
			loadLevel("Copied level", location.hash.substr(1));
		}
	}
	setTimeout(window.onhashchange, 50); // wtf
});


var id2class = {
	"G": "bf-grass", "S": "bf-grass", "F": "bf-fish",
	"T": "bf-tree",  "B": "bf-box",   "C": "bf-drum",
	"R": "bf-rock",  "c": "bf-cat",
}, class2id = {
	"bf-grass": "G", "bf-cat": "S", "bf-fish": "F",
	"bf-tree":  "T", "bf-box": "B", "bf-drum": "C",
	"bf-rock":  "R", "": "G",
};

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
	$(".bf-tile").each(function (i) {
		var tile = data.charAt(i);
		var $this = resetTile($(this).data("orig", id2class[tile]));

		if (tile == "S") {
			// Move cat to start position.
			var x = i % 16, y = Math.floor(i / 16);
			setObject("cat", x, y);
			$(".bf-field .bf-cat").data({
				"origX": x,
				"origY": y,
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
	return $(".bf-field .bf-" + obj).animate({
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
	$obj.removeClass("bf-grass bf-fish bf-tree bf-box bf-drum bf-rock bf-cat");
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
	var xy = $(".bf-field .bf-cat").data();
	if ([
		whatTile(xy.x-1, xy.y), whatTile(xy.x, xy.y-1),
		whatTile(xy.x+1, xy.y), whatTile(xy.x, xy.y+1)
	].indexOf("bf-fish") != -1) {
		catQueue = [];
		playerWins();
	}

	if (catQueue.length) {
		var next = catQueue.shift();
		if (!$(".bf-field .bf-cat").is(":animated")) {
			var xy = $(".bf-field .bf-cat").data();
			switch(next) {
				case "left":  moveCat(xy.x-1, xy.y,   xy.x-2, xy.y  ); break;
				case "up":    moveCat(xy.x,   xy.y-1, xy.x,   xy.y-2); break;
				case "right": moveCat(xy.x+1, xy.y,   xy.x+2, xy.y  ); break;
				case "down":  moveCat(xy.x,   xy.y+1, xy.x,   xy.y+2); break;
			}
		}
	}
}

function pushCatQueue(direction) {
	// No more movement if level is beaten.
	if (beatLevel || $(".bf-custom").is(":visible")) return;

	catQueue.push(direction);
	if (!$(".bf-field .bf-cat").is(":animated") && catQueue.length == 1) {
		popCatQueue();
	}
}

function queueCat(direction) {
	return function () { pushCatQueue(direction); }
}

function restartLevel() {
	if($(".bf-custom").is(":visible")) return;
	if (winningAnimationTimer) clearTimeout(winningAnimationTimer);

	$(".bf-tile").each(function () {
		resetTile($(this));
	});

	var xy = $(".bf-field .bf-cat").data();
	setObject("cat", xy.origX, xy.origY);

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

function showRegular() {
	$(".bf-custom").hide();
	$(".bf-regular").show();

	$(".bf-tile").each(function () {
		resetTile($(this));
	});
	$(".bf-field .bf-cat").show();
}


//////// Editor Code /////////
function showCustom() {
	restartLevel();
	$(".bf-regular").hide();
	$(".bf-custom").show();

	resetTile($(".bf-movable"), "");
	var xy = $(".bf-field .bf-cat").hide().data();
	resetTile(getTile(xy.origX, xy.origY), "bf-cat");

	updateCurrent();
}

var currentPiece = "G";
function selectPiece(piece) {
	currentPiece = piece;
	updateCurrent();
}

var currentTool = "paint";
function selectTool(tool) {
	currentTool = tool;
	updateCurrent();
}

function updateCurrent() {
	var $current = $(".bf-current").empty();

	$(".bf-pieces .selected").removeClass("selected");
	$(".bf-pieces").find("." + id2class[currentPiece]).addClass("selected");

	$(".bf-tools .selected").removeClass("selected");
	$(".bf-tools").find(".bf-" + currentTool).addClass("selected");

	switch(currentTool) {
		case "paint":
			$("<div>").addClass("bf-cur1x2").append([
				$("<span>").addClass("bf-paint"),
				$("<span>").addClass(id2class[currentPiece])
			]).appendTo($current);
			break;

		case "toggle":
			$("<div>").addClass("bf-cur3x1").append([
				$("<span>").addClass("bf-grass"),
				$("<span>").addClass("bf-toggle"),
				$("<span>").addClass(id2class[currentPiece])
			]).appendTo($current);
			break;

		case "cycle":
			switch(currentPiece) {
				case "c":
				case "F":
					$("<div>").addClass("bf-cur3c").append([
						$("<span>").addClass("bf-grass"),
						$("<span>").addClass("bf-cat"),
						$("<span>").addClass("bf-fish"),
						$("<span>").addClass("bf-cycle")
					]).appendTo($current);
					break;

				case "T":
				case "B":
				case "C":
					$("<div>").addClass("bf-cur4c").append([
						$("<span>").addClass("bf-grass"),
						$("<span>").addClass("bf-tree"),
						$("<span>").addClass("bf-box"),
						$("<span>").addClass("bf-drum"),
						$("<span>").addClass("bf-cycle")
					]).appendTo($current);
					break;

				case "R":
					$("<div>").addClass("bf-cur3x1").append([
						$("<span>").addClass("bf-grass"),
						$("<span>").addClass("bf-cycle"),
						$("<span>").addClass("bf-rock")
					]).appendTo($current);
					break;

				default:
					$("<div>").addClass("bf-cur1x2").append([
						$("<span>").addClass("bf-cycle"),
						$("<span>").addClass(id2class[currentPiece])
					]).appendTo($current);
					break;
			}
	}
}

var pastChanges = [], futureChanges = [];
function undoChange() {
	if (isDrawing || pastChanges.length == 0 || !$(".bf-custom").is(":visible")) return;

	var change = pastChanges.pop(), cc;
	if (change[0]) cc = change[1];
	else cc = [change.slice(1)];

	for (var i = cc.length - 1; i >= 0; --i) {
		resetTile(cc[i][0], cc[i][1]);
	}

	futureChanges.unshift(change);
}

function redoChange() {
	if (isDrawing || futureChanges.length == 0 || !$(".bf-custom").is(":visible")) return;

	var change = futureChanges.shift(), cc;
	if (change[0]) cc = change[1];
	else cc = [change.slice(1)];

	for (var i = 0; i < cc.length; ++i) {
		resetTile(cc[i][0], cc[i][2]);
	}

	pastChanges.push(change);
}

function setError(err) {
	$(".bf-editor-error").text(err);
	return false;
}

function getCustomName() {
	return $(".bf-custom-name").val().trim();
}

function verifyLevel() {
	if (getCustomName() == "") {
		$(".bf-custom-name").focus();
		return setError("Enter a level name.");
	}

	if ($(".bf-field .bf-cat").length != 2) {
		return setError("Level must have exactly one cat.");
	}

	if ($(".bf-field .bf-fish").length != 1) {
		return setError("Level must have exactly one fish.");
	}

	$(".bf-editor-error").empty();
	return true;
}

function levelToString() {
	var tiles = "";
	$(".bf-tile").each(function () {
		tiles += class2id[whatTile($(this))];
	});
	return tiles;
}

function saveLevel() {
	if (verifyLevel()) {
		var name = getCustomName().replace(/\x01/g, "");
		localStorage.setItem(name, levelToString());
		if ("levels" in localStorage) {
			localStorage.levels += "\x01" + name;
		} else {
			localStorage.levels = name;
		}
	}
}

function loadSavedLevel() {
	if ("levels" in localStorage && localStorage.levels) {
		var $loader = $(".bf-level-loader").empty().show(),
		levels = localStorage.levels.split("\x01"),
		$del = $("<span>").text("X");
		for (var i = 0; i < levels.length; i++) {
			if (levels[i]) {
				$("<div>").addClass("bf-loader-entry").appendTo($loader)
				.data("deleting", false).append([
					$("<span>").text(levels[i]).click(doLoadLevel),
					$del.clone().click(deleteLevel)
				]);
			}
		}
		$("<span>").addClass("bf-loader-entry").text("Close selector")
		.appendTo($loader).click(dontLoadLevel);
	} else {
		setError("No saved levels.")
	}
}

function doLoadLevel() {
	var level = $(this).text(), $parent = $(this).parent();
	if ($parent.data("deleting")) {
		// Delete the level.
		level = $parent.data("text");
		localStorage.removeItem(level);
		localStorage.levels = localStorage.levels.replace(level, "")
		.replace(/^\x01|\x01$/, "").replace(/\x01\x01/g, "");
		$parent.remove();
		return;
	}

	$(".bf-custom-name").val(level);
	loadLevel(level, localStorage.getItem(level));
	var xy = $(".bf-field .bf-cat").data();
	resetTile(getTile(xy.origX, xy.origY), "bf-cat");

	pastChanges = [];
	futureChanges = [];
	$(".bf-level-loader").hide();
}

function dontLoadLevel() {
	$(".bf-level-loader").hide();
}

function deleteLevel() {
	var $parent = $(this).parent();
	if ($parent.data("deleting")) {
		// Cancel deletion.
		$parent.data("deleting", false)
		.children(":first").text($parent.data("text"));
		return;
	}

	$parent.data({
		"deleting": true,
		"text": $parent.children(":first").text()
	}).children(":first").text("Are you sure you want to delete this?");
}

function copyLevelURL() {
	// RLE
	var tiles = levelToString() + "\0", final = "", last = "", count = 0;
	for (var i = 0; i < tiles.length; ++i) {
		if (last != tiles[i]) {
			if (count > 1) final += last + count;
			else final += last;
			last = tiles[i];
			count = 1;
		} else {
			count += 1;
		}
	}
	
	var link = location.origin + location.pathname + location.search + "#" + final;
	return link
}

function testLevel() {
	loadLevel(getCustomName(), levelToString());
	showRegular();
}

function drawPiece(tile, piece) {
	var $tile = $(tile);
	piece = id2class[piece || currentPiece];

	// Store undo history.
	pastChanges.push([
		false,
		$tile,
		whatTile($tile),
		piece,
	]);
	// Clear redo history.
	if (futureChanges.length) futureChanges = [];

	resetTile($tile, piece);
}

var isDrawing = false,
startDrawing = 0;
function tileMouseDown() {
	if ($(".bf-custom").is(":visible")) {
		switch(currentTool) {
			case "paint":
				isDrawing = true;
				startDrawing = pastChanges.length;
				drawPiece(this);
				break;
			case "toggle":
				if (whatTile($(this)) == "bf-grass") {
					drawPiece(this);
				} else {
					resetTile($(this), "bf-grass");
				}
				break;
			case "cycle":
				var tile = whatTile($(this));

				switch(currentPiece) {
					case "c":
					case "F":
						console.log(tile);
						switch(tile) {
							case id2class["c"]:
								drawPiece(this, "F");
								break;
							case id2class["F"]:
								drawPiece(this, "G");
								break;
							case id2class["G"]:
								drawPiece(this, "c");
								break;
							default:
								drawPiece(this);
								break;
						}
						break;

					case "T":
					case "B":
					case "C":
						switch(tile) {
							case id2class["T"]:
								drawPiece(this, "B");
								break;
							case id2class["B"]:
								drawPiece(this, "C");
								break;
							case id2class["C"]:
								drawPiece(this, "G");
								break;
							case id2class["G"]:
								drawPiece(this, "T");
								break;
							default:
								drawPiece(this);
								break;
						}
						break;

					case "R":
						switch(tile) {
							case id2class["R"]:
								drawPiece(this, "G");
								break;
							case id2class["G"]:
								drawPiece(this, "R");
								break;
							default:
								drawPiece(this);
								break;
						}
						break;

					default:
						drawPiece(this);
						break;
				}
				break;
		}
	}
}

function tileMouseEnter() {
	if ($(".bf-custom").is(":visible") && currentTool == "paint" && isDrawing) {
		drawPiece(this);
	}
}

function tileMouseUp() {
	isDrawing = false;

	// Group changes
	if (pastChanges.length - startDrawing > 1) {
		var changes = pastChanges.splice(startDrawing), cc = [];
		for (var i = 0; i < changes.length; i++) {
			cc.push(changes[i].slice(1));
		}
		pastChanges.push([true, cc]);
	}
}