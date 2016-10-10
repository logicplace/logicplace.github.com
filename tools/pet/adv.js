// Make the Megaman Advanced PET known
PETS.push("adv");
BASE_PETS.adv = "advanced/";

// Init the database
var advancedDB = new Loki("AdvancedPET", {
	"adapter": idiAdapter,
	//"verbose": true,
});

advancedDB.loadDatabase();

//filename, number, type, class, cp, at, element, field, effect, icon, pins, notes, updated, releases
advancedDB.chips = db.addCollection("chips", {
	"unique": ["filename"],
});
//filename, region, name, origin, front.image, front.credits, back.image, back.credits, notes
advancedDB.releases = db.addCollection("releases", {
	"indicies": ["filename", "region"],
});

PET_DBS.adv = advancedDB;

var advGenericBacks = {
	"Standard-jp": "Class スタンダード (back).png",
	"Mega-jp": "Class　メガ (back).png"
}

PET_HANDLERS.adv = {
	"chip": function (chip, region) {
		var element = chip.element || "Unknown",
		name = region.name == null ? "?" : region.name

		// Chip face.
		$(".adv-chip-class-border")
			.removeClass("standard mega giga navi")
			.addClass((chip.class || "").toLowerCase());
		$(".adv-chip-type-name")
			.removeClass("attack ability navi")
			.addClass((chip.type || "").toLowerCase());
		$(".adv-chip-image").css(
			"background-image",
			chip.icon ? 'url("' + chipURL("adv", chip.icon) + '")' : "");
		$(".adv-chip-element")
			.removeClass("neutral aqua fire wood electric")
			.addClass(element.toLowerCase());
		$(".adv-chip-name").text(name);
		$(".adv-chip-number").text(chip.number || "000");

		// Chip photos/scans.
		$(".chip-image-front").css(
			"background-image",
			'url("' + chipURL("adv", region.front.image || "/tools/pet/images/noimg") + '")')
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
			if (!back) back = "/tools/pet/images/noimg";
			$(".chip-image-back").addClass("unsure-back");
			backGen = "\nGeneric back image."
		} else {
			$(".chip-image-back").removeClass("unsure-back");
		}

		$(".chip-image-back").css(
			"background-image",
			'url("' + chipURL("adv", back) + '")')
			.attr("title", (region.back.credits || "") + backGen);

		// Data sheet.
		$(".adv-name").text(name)
		$(".adv-number").text(chip.number || "?");
		$(".adv-type").text(chip.type || "?");
		$(".adv-class").text(chip.class || "?");
		$(".adv-element")
			.attr({
				"class": "",
				"title": element
			})
			.addClass("local-adv-element-" + element.toLowerCase());
		$(".adv-cp").text(chip.cp == null ? "?" : chip.cp);
		$(".adv-at").text(chip.at == null ? "?" : chip.at);
		$(".adv-effect").text(chip.effect || "");
		$(".adv-origin").text(region.set || "?");
		$(".adv-notes").text((chip.notes ? chip.notes + "\n" : "") + (region.notes || ""));

		var $field = $(".adv-field").empty();
		makeField($field, chip.field);

		var $pins = $(".adv-pins").empty();
		makePins($pins, chip.pins);

		var $regions = $(".adv-other-regions").empty();
		for (var i = chip.releases.length - 1; i >= 0; --i) {
			var rg = chip.releases[i];
			$("<span>").addClass("local-region-" + rg)
				.click(viewLoader(loadChipForm, "adv", [chip.filename, rg]))
				.appendTo($regions);
		}

		chipHooks();
	},

	"chipFail": function (error) {
		// Chip face.
		$(".adv-chip-class-border")
			.removeClass("standard mega giga navi");
		$(".adv-chip-type-name")
			.removeClass("attack ability navi");
		$(".adv-chip-image").css("background-image", "");
		$(".adv-chip-element")
			.removeClass("neutral aqua fire wood electric");
		$(".adv-chip-name").text("?");
		$(".adv-chip-number").text("000");
		$(".chip-image-front").css("background-image", "").attr("title", "");
		$(".chip-image-back").css("background-image", "").attr("title", "");

		// Data sheet.
		$(".adv-name").text("ERROR FINDING CHIP");
		$(".adv-number").text("?");
		$(".adv-type").text("?");
		$(".adv-class").text("?");
		$(".adv-element")
			.attr({
				"class": "",
				"title": ""
			});
		$(".adv-cp").text("?");
		$(".adv-at").text("?");
		$(".adv-pins").empty();
		$(".adv-field").empty();
		$(".adv-effect").text("");
		$(".adv-origin").text("?");
		$(".adv-notes").text(error);
		$(".adv-other-regions").empty();
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
			$("<span>").addClass("adv-chip-image").css("background-image", chip.icon).appendTo($icon);
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

function chipHooks() {
	// Controls.
	$(".previous-chip-image, .next-chip-image").off("click").click(function () {
		var $stdFront = $(".chip-standard-image-front"),
		$stdBack = $(".chip-standard-image-back"),
		$front = $(".chip-image-front"),
		$back = $(".chip-image-back");

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

	$(".flip-chip-image").off("click").click(function () {
		var $stdFront = $(".chip-standard-image-front"),
		$stdBack = $(".chip-standard-image-back"),
		$front = $(".chip-image-front"),
		$back = $(".chip-image-back");

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
