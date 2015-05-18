jQuery.fn.htmlClean = function() {
	this.contents().filter(function() {
		if (this.nodeType != 3) {
			$(this).htmlClean();
			return false;
		}
		else {
			this.textContent = $.trim(this.textContent);
			return !/\S/.test(this.nodeValue);
		}
	}).remove();
	return this;
}

$(function () {
	console.log("Cleaning")
	$("#mtgsets").htmlClean();
});

function getCards() {
	clearPool();

	var cards = $("#cardlist").val().split("\n");
	for (var i = 0; i < cards.length; ++i) {
		getCard(cards[i]);
	}
}

function getCard(name) {
	$.ajax({
		"url": "http://api.mtgapi.com/v2/cards",
		"data": {
			"name": name,
		},
		"success": updatePool,
	})
}

function formatCardList() {
	var cards = $("#cardlist").val().split("\n"),
	    search = /^[0-9]*x? *|\|.*$|#.*$/g;
	for (var i = 0; i < cards.length; ++i) {
		cards[i] = cards[i].replace(search, "");
	}
	$("#cardlist").val(cards.join("\n"));
}

var sets = {};
function clearPool() {
	$(".set:not(.template)").remove();
	sets = {};
}

function updatePool(data) {
	// [ {
	//	"name": "",
	//	"colors": [],
	//	"set": "",
	//	"rarity": "",
	// }, ...]

	if (!("cards" in data) || data.cards == null || typeof(data.cards) != "object") {
		console.log("Bad updatePool call", data);
		return;
	}

	for (var i = 0; i < data.cards.length; ++i) {
		var card = data.cards[i];

		if (!(card.set in sets)) {
			sets[card.set] = {
				"cards": [],
			};

			$.ajax({
				"url": card.links.set,
				"success": function (data) {
					sets[data.sets[0].code].name = data.sets[0].name;
				},
			});
		}

		if (!(card.name in sets[card.set].cards)) {
			sets[card.set].cards.push({
				"name": card.name,
				"colors": card.colors,
				"rarity": card.rarity,
			});
		}
	}

	redraw();
}

function setSort(a, b) {
	return b[1] - a[1];
}

function redraw() {
	// Sort the sets
	var sortedSets = [];
	for (var x in sets) {
		sortedSets.push([x, sets[x].cards.length]);
	}
	sortedSets.sort(setSort);

	for (var i = 0; i < sortedSets.length; ++i) {
		var x = sortedSets[i][0], set = sets[x],
		    $set = set.elem || $(".set.template").clone().removeClass("template");
		$set.find(".set-head").text(x).hover(setNameIn(x), hideHover);
		$set.data("id", x);
		set.elem = $set;

		// Summarize information
		set.numcards = set.cards.length;
		set.colors = {
			"None": 0,
			"Multicolor": 0,
		};
		set.rarities = {};
		set.cardsByColor = {
			"None": [],
			"Multicolor": [],
		};
		set.cardsByRarity = {};
		for (var name in set.cards) {
			var card = set.cards[name];

			// Colors
			if (card.colors == null) {
				++set.colors.None;
				set.cardsByColor.None.push(card);
			} else if (card.colors.length > 1) {
				++set.colors.Multicolor;
				set.cardsByColor.Multicolor.push(card);
			} else {
				var color = card.colors[0];
				if (color in set.colors) {
					++set.colors[color];
					set.cardsByColor[color].push(card);
				} else {
					set.colors[color] = 1;
					set.cardsByColor[color] = [card];
				}
			}

			// Rarity
			if (card.rarity in set.rarities) {
				++set.rarities[card.rarity];
				set.cardsByRarity[card.rarity].push(card);
			} else {
				set.rarities[card.rarity] = 1;
				set.cardsByRarity[card.rarity] = [card];
			}
		}

		// Display summary
		for (var c in set.colors) {
			if (set.colors[c] > 0) {
				$set.find(".color." + prepClass(c))
				.text(set.colors[c])
				.hover(colorIn(x, c), hideHover)
				.css("display", "inline-block");
			}
		}
		for (var r in set.rarities) {
			$set.find(".rarity." + prepClass(r))
			.text(set.rarities[r])
			.hover(rarityIn(x, r), hideHover)
			.css("display", "inline-block");
		}

		$(".set.template").parent().append($set);
	}
}

function prepClass(name) {
	return name.replace(/ /g, "-");
}

function setNameIn(set) {
	return function () {
		$listing = displayHover(this, sets[set].name);
	}
}

function colorIn(set, color) {
	return function () {
		var $listing = displayHover(this, "Color: " + color),
		    list = sets[set].cardsByColor[color];

		if (color == "Multicolor") {
			var $div = $('<div><span class="cardname"></span><span class="colors"></span></div>');
			for (var i = 0; i < list.length; ++i) {
				var $d2 = $div.clone();
				$d2.find(".cardname").text(list[i].name);
				$d2.find(".colors").text(list[i].colors.toString());
				$d2.appendTo($listing);
			}
		} else {
			var $div = $("<div>");
			for (var i = 0; i < list.length; ++i) {
				$div.clone().text(list[i].name).appendTo($listing);
			}
		}
	};
}

function rarityIn(set, rarity) {
	return function () {
		var $listing = displayHover(this, "Rarity: " + rarity),
		    list = sets[set].cardsByRarity[rarity];

		var $div = $("<div>");
		for (var i = 0; i < list.length; ++i) {
			$div.clone().text(list[i].name).appendTo($listing);
		}
	};
}

function displayHover(ev, title) {
	var $listing = $("#hover .listing").empty();
	$("#hover .title").text(title);

	var pos = $(ev).position(), width = $(ev).width();
	$("#hover").show().css({
		"top": pos.top,
		"left": pos.left + width,
	});

	return $listing;
}

function hideHover() {
	$("#hover").hide();
}