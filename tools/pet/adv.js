// Make the Megaman Advanced PET known
PETS.push("adv");
BASE_PETS.adv = "advanced/";
ADV_BASE_CHIP_IMG_URL = "/tools/pet/advanced/chips/";
ADV_BASE_NO_IMG_URL = "/tools/pet/advanced/images/noimg.jpg";

var ADVANCED_DB;
waitFor(["BASE_DB"], function () {
	// Init the database
	ADVANCED_DB = BASE_DB.sub("AdvancedPET");
	ADVANCED_DB.chips = ADVANCED_DB.sub("chips").primary("filename");
	ADVANCED_DB.releases = ADVANCED_DB.sub("releases").primary(["filename", "region"]);

	PET_DBS.adv = ADVANCED_DB;
});

var advGenericBacks = {
	"Standard-jp": "Class スタンダード (back).png",
	"Mega-jp": "Class　メガ (back).png"
}

PET_HANDLERS.adv = {
	"chip": function ($view, chip, region) {
		var element = chip.element || "Unknown",
		name = region.name == null ? "?" : region.name

		// Chip face.
		$view.find(".adv-chip-class-border")
			.removeClass("standard mega giga navi")
			.addClass((chip.class || "").toLowerCase());
		$view.find(".adv-chip-type-name")
			.removeClass("attack ability navi")
			.addClass((chip.type || "").toLowerCase());
		$view.find(".adv-chip-image").css(
			"background-image",
			chip.icon ? 'url("' + chipURL("adv", chip.icon) + '")' : "");
		var $elem = $view.find(".adv-chip-element")
			.removeClass("neutral aqua fire wood electric")
			.addClass(element.toLowerCase());
		var $name = $view.find(".adv-chip-name").text(name);
		$view.find(".adv-chip-number").text(chip.number || "000");

		$name.css({
			"transform": "",
			"transform-origin": "",
			"overflow": "",
			"margin-left": "",
		});

		var target = $view.find(".adv-chip-element-name").width() - $elem.outerWidth() - 2;
		var width = $name.css("width", "initial").width();
		$name.css("width", "");

		if (width > target) {
			var scale = target / width;
			var offset = Math.min(0.5, (width - width * scale) / 2);
			$name.css({
				"transform": "scaleX(" + scale.toString() + ")",
				"transform-origin": "left",
				"overflow": "visible",
				"margin-left": (parseInt($name.css("margin-left")) - offset).toString() + "px",
			});
		}

		// Chip photos/scans.
		$view.find(".chip-image-front").css(
			"background-image",
			'url("' + chipURL("adv", region.front.image || ADV_BASE_NO_IMG_URL) + '")')
			.attr("title", region.front.credits);

		var back = region.front.back, backGen = "";
		if (!back) {
			// Sort current to "first" index
			var rr = chip.releases.concat([region.region]);
			rr.splice(rr.indexOf(region.region), 1);

			for (var i = rr.length - 1; i >= 0; --i) {
				var b = chip.class + "-" + rr[i];
				if (b in advGenericBacks) {
					back = advGenericBacks[b];
				}
			}
			if (!back) back = ADV_BASE_NO_IMG_URL;
			$view.find(".chip-image-back").addClass("unsure-back");
			backGen = "\nGeneric back image."
		} else {
			$view.find(".chip-image-back").removeClass("unsure-back");
		}

		$view.find(".chip-image-back").css(
			"background-image",
			'url("' + chipURL("adv", back) + '")')
			.attr("title", (region.back.credits || "") + backGen);

		// Data sheet.
		$view.find(".adv-name").text(name)
		$view.find(".adv-number").text(chip.number || "?");
		$view.find(".adv-type").text(chip.type || "?");
		$view.find(".adv-class").text(chip.class || "?");
		$view.find(".adv-element")
			.attr({
				"class": "adv-element",
				"title": element
			})
			.addClass("local-adv-element-" + element.toLowerCase());
		$view.find(".adv-cp").text(chip.cp == null ? "?" : chip.cp);
		$view.find(".adv-at").text(chip.at == null ? "?" : chip.at);
		$view.find(".adv-effect").text(chip.effect || "");
		$view.find(".adv-origin").text(region.set || "?");
		$view.find(".adv-notes").text((chip.notes ? chip.notes + "\n" : "") + (region.notes || ""));

		var $field = $view.find(".adv-field").empty();
		makeField($field, chip.field);

		var $pins = $view.find(".adv-pins").empty();
		makePins($pins, chip.pins);

		var $regions = $view.find(".adv-other-regions").empty();
		for (var i = chip.releases.length - 1; i >= 0; --i) {
			var rg = chip.releases[i];
			$("<span>").addClass("local-region-" + rg)
				.click(viewLoader(loadChipForm, "adv", chip.filename, rg))
				.appendTo($regions);
		}

		chipHooks($view);
	},

	"chipFail": function ($view, error) {
		// Chip face.
		$view.find(".adv-chip-class-border")
			.removeClass("standard mega giga navi");
		$view.find(".adv-chip-type-name")
			.removeClass("attack ability navi");
		$view.find(".adv-chip-image").css("background-image", "");
		$view.find(".adv-chip-element")
			.removeClass("neutral aqua fire wood electric");
		$view.find(".adv-chip-name").text("?");
		$view.find(".adv-chip-number").text("000");
		$view.find(".chip-image-front").css("background-image", "").attr("title", "");
		$view.find(".chip-image-back").css("background-image", "").attr("title", "");

		// Data sheet.
		$view.find(".adv-name").text("ERROR FINDING CHIP");
		$view.find(".adv-number").text("?");
		$view.find(".adv-type").text("?");
		$view.find(".adv-class").text("?");
		$view.find(".adv-element")
			.attr({
				"class": "",
				"title": ""
			});
		$view.find(".adv-cp").text("?");
		$view.find(".adv-at").text("?");
		$view.find(".adv-pins").empty();
		$view.find(".adv-field").empty();
		$view.find(".adv-effect").text("");
		$view.find(".adv-origin").text("?");
		$view.find(".adv-notes").text(error);
		$view.find(".adv-other-regions").empty();
	},

	"createRow": function ($row, region, chip) {
		$row.find(".adv-filename").text(chip.filename);
		$row.find(".adv-number").text(chip.number || "???");
		$row.find(".adv-region").addClass("local-region-" + region.region);
		$row.find(".adv-name").text(region.name || "?");
		$row.find(".adv-type").text(chip.type || "?");
		$row.find(".adv-class").text(chip.class || "?");
		$row.find(".adv-cp").text(or(chip.cp, "?"));
		$row.find(".adv-at").text(or(chip.at, "?"));
		$row.find(".adv-element").text(chip.element || "?");
		var $field = $("<span>").addClass("adv-field").appendTo($row.find(".adv-field-cell")),
		$pins = $row.find(".adv-pins");
		makeField($field, chip.field);
		$field.data("raw", chip.field);
		makePins($pins, chip.pins);
		$pins.data("raw", chip.pins);
		var $icon = $row.find(".adv-icon");
		if (chip.icon) {
			$("<img>")
				.addClass("adv-chip-image")
				.attr("src", chipURL("adv", chip.icon))
				.appendTo($icon);
			$row.find(".adv-has-icon").addClass("pet-has-image");
		} else {
			$icon.text("?");
		}
		if (region.front.image) $row.find(".adv-has-front-image").addClass("pet-has-image");
		if (region.back.image) $row.find(".adv-has-back-image").addClass("pet-has-image");
		$row.find(".adv-front-credits").text(region.front.credits || "");
		$row.find(".adv-back-credits").text(region.back.credits || "");
		$row.find(".adv-origin").text(region.set || "?");
		$row.find(".adv-notes").text(chip.notes || "");
		$row.find(".adv-region-notes").text(region.notes || "");
	},

	"rowFail": function (error) {
		console.log("Failed to fetch info for row: " + error);
	},
}

function or(x, y) { return x === null ? y : x; }

function chipHooks($view) {
	// Controls.
	$view.find(".previous-chip-image, .next-chip-image").off("click").click(function () {
		var $stdFront = $view.find(".chip-standard-image-front"),
		$stdBack = $view.find(".chip-standard-image-back"),
		$front = $view.find(".chip-image-front"),
		$back = $view.find(".chip-image-back");

		if ($stdFront.is(":visible")) {
			$stdFront.addClass("hidden");
			$front.removeClass("hidden");
		} else if ($stdBack.is(":visible")) {
			$stdBack.addClass("hidden");
			$back.removeClass("hidden");
		} else if ($front.is(":visible")) {
			$front.addClass("hidden");
			$stdFront.removeClass("hidden");
		} else if ($back.is(":visible")) {
			$back.addClass("hidden");
			$stdBack.removeClass("hidden");
		}
	});

	$view.find(".flip-chip-image").off("click").click(function () {
		var $stdFront = $view.find(".chip-standard-image-front"),
		$stdBack = $view.find(".chip-standard-image-back"),
		$front = $view.find(".chip-image-front"),
		$back = $view.find(".chip-image-back");

		if ($stdFront.is(":visible")) {
			$stdFront.addClass("hidden");
			$stdBack.removeClass("hidden");
		} else if ($stdBack.is(":visible")) {
			$stdBack.addClass("hidden");
			$stdFront.removeClass("hidden");
		} else if ($front.is(":visible")) {
			$front.addClass("hidden");
			$back.removeClass("hidden");
		} else if ($back.is(":visible")) {
			$back.addClass("hidden");
			$front.removeClass("hidden");
		}
	});
}

function makeField($field, field) {
	if (field) {
		for (var i = 0; i < 9; ++i) {
			$("<span>").addClass("field-" + field[i]).appendTo($field)
		}
	} else {
		if (field === "") $field.text("N/A")
		else $field.text("?")
	}

}

function makePins($pins, pins) {
	if (pins) {
		for (var i = 0; i < 11; ++i) {
			$("<span>").addClass("pin-" + pins[i]).appendTo($pins)
		}
	} else {
		$pins.text("?")
	}
}
