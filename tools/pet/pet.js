var BASE_URL = "/tools/pet/";

var PETS = []
var BASE_PETS = {}
var PET_DBS = {}
var PET_HANDLERS = {}

$(function () {
	if (PETS.length) update();
	else setTimeout(update, 100);
});

function forAllPets(func, callback) {
	var unaccounted = PETS.length;

	function dec() {
		if(!--unaccounted && callback) callback();
	}

	for (var i = PETS.length - 1; i >= 0; i--) {
		func(PETS[i], dec);
	}
}

function filenameToNumber(filename) {
	var mo = filename.match("^(.*/)?([0-9]+.?)\.json$");
	if (mo) return mo[2];
	return null;
}

function update(callback) {
	function _(pet, callback) {
		$.ajax({
			"url": BASE_URL + BASE_PETS[pet] + "updated.json",

			"success": function (updated) {
				// Enumerate list and check with local database if any need to be updated.
				// If it does, download that JSON file and update the entry.
				console.log("Downloaded updated.json for " + pet)
				function processResult(item) {
					if (!("updated" in item) || item.updated < updated[item.filename]) {
						// Download update.
						var fn_path = BASE_PETS[pet] + item.filename;
						$.ajax({
							"url": BASE_URL + fn_path,

							"success": function (json) {
								console.log("Downloaded " + fn_path)
								var petDB = PET_DBS[pet];

								// Add key and updated time.
								json.filename = item.filename;
								json.number = filenameToNumber(item.filename);
								json.updated = updated[item.filename];

								// Separate releases.
								var releases = json.releases;
								json.releases = [];
								for (var region in releases) {
									var release = releases[region];
									release.filename = item.filename
									release.region = region

									petDB.releases.put(release);

									json.releases.push(region);
								}

								// Update DB entry.
								petDB.chips.put(json);
							},

							"failure": function () {
								console.error("Failed to download update for " + fn_path);
								// TODO: Reason
							},
						});
					}
				}

				function kickResult(filename) {
					return function () {
						processResult({"filename": filename});
					} 
				}

				for(var filename in updated) {
					PET_DBS[pet].chips
						.get(filename, processResult)
						.catch(kickResult(filename));
				}
			},

			"failure": function () {
				console.error("Failed to download update list.");
				// TODO: Reason
			},
		});
	}

	forAllPets(_, callback);
	loadListForm("adv");
}

var FORMS = {};
function loadViews(pet, callback) {
	console.log("Downloading views")
	$.ajax({
		"url": BASE_URL + pet + ".html",

		"success": function (html) {
			console.log("Successfully downloaded")
			var html = $.parseHTML(html), views = {};
			for (var i = html.length - 1; i >= 0; i--) {
				var $node = $(html[i]),
				view = ($node.attr("class") || "").match("pet-([^\-]+)-view");
				if (view) {
					// http://stackoverflow.com/questions/27841112
					$node.find("*").contents().filter(function() {
						return this.nodeType == Node.TEXT_NODE && !/\S/.test(this.nodeValue);
					}).remove();
					views[view[1]] = $node;
				} else if ($node.is("link")) {
					$("head").append($node);
				}
			}

			FORMS[pet] = views;
			callback(pet);
		},

		"failure": function () {
			console.log("Failed downloading")
		}
	});
}

function chipURL(pet, img) {
	if (img.match(/^\/|^https?:\/\//)) {
		return img;
	} else {
		return BASE_URL + BASE_PETS[pet] + "chips/" + img
	}
}

function showHome() {
	$(".form-pane").hide();
	$(".home-pane").show();
}

function viewLoader(func) {
	var args = Array.prototype.slice.call(arguments, 1);
	return function () {
		func.apply(null, args);
	}
}

function loadChipForm(pet, filename_region) {
	if (pet in FORMS) {
		if ($(".form-pane").show().find(FORMS[pet].chip.attr("class").replace(/(^| +)/g, "$1.")).length == 0) {
			$(".home-pane").hide();
			$(".form-pane").empty().append(FORMS[pet].chip);
		}
		
		var petDB = PET_DBS[pet];
		petDB.releases
			.get(filename_region, function (region) {
				petDB.chips
					.get(filename_region[0], function (chip) {
						PET_HANDLERS[pet].chip(chip, region);
					})
					.catch(PET_HANDLERS[pet].chipFail);
			})
			.catch(PET_HANDLERS[pet].chipFail);
	} else {
		loadViews(pet, function () {
			loadChipForm(pet, filename_region);
		});
	}
}

var $LIST_ROW = null;
function loadListForm(pet) {
	if (pet in FORMS) {
		$(".home-pane").hide();

		// Add header and hide non-defaults
		var $header = FORMS[pet].row.clone(), hideClass = [];
		
		$header.children().each(function () {
			var $this = $(this),
			cl = headerClassAndName(pet, $this);
			$this.data({
				"name": cl[1],
				"class": cl[0]
			})
			.addClass("short-name local-pet-" + cl[1]);

			if (!$this.is(".default")) {
				hideClass.push(cl[0]);
			}
		});
		hideClass = "." + hideClass.join(", .");

		$header.find(":not(.default)").hide();
		$header.find(".sortable").click(PET_HANDLERS[pet].sortColumn);
				
		// TODO: resizeable?
		$(".pet-list-table-header").empty().append($header.children());

		// Use header to create settings
		var $visibility = $("<div>").addClass("pet-list-setting pet-list-visibility"),
		$visEntry = $("<span>").append(
			$('<input type="checkbox">').click(toggleColumn),
			$('<label>')
		);
		$header.find(":not(.required)").each(function () {
			var $this = $(this),
			cl = headerClassAndName(pet, $this),
			$copy = $visEntry.clone();
			$copy.data({
				"name": cl[1],
				"class": cl[0]
			});
			if ($(this).is(".default")) {
				$copy.find("input").prop("checked", true);
			}
			$copy.find("label").addClass("local-pet-" + cl[1]);
			$visibility.append($copy);
		});
		$(".pet-list-settings-pane").empty().append($visibility);

		// Create row template
		$LIST_ROW = FORMS[pet].row.clone();
		$LIST_ROW.children().each(function () {
			$(this).removeClass("default required sortable");
		});

		$(".list-view").show();

		var petDB = PET_DBS[pet], $table = $(".pet-list-table-rows").empty();
		petDB.transaction("r", "chips", "releases", function () {
			var sizes = {};
			$(".pet-list-table-header span").each(function () {
				var $this = $(this), width = $this.width() + 5;
				sizes[$this.data("class")] = width;
				$this.width(width);
			});

			return petDB.chips.limit(2).each(function (chip) {
				return petDB.releases
					.where("filename")
					.equals(chip.filename)
					.each(function (region) {
						var $row = $LIST_ROW.clone().addClass("pet-list-table-row");
						PET_HANDLERS[pet].createRow($row, region, chip);
						$row.find(hideClass).hide();
						$table.append($row);
						$row.children().each(function () {
							var $this = $(this),
							newWidth = $this.width(),
							cl = headerClassAndName(pet, $this)[0]
							curWidth = sizes[cl];
							if (newWidth > curWidth) {
								$(".pet-list-table-pane ." + cl).width(newWidth);
								sizes[cl] = newWidth;
							} else {
								$this.width(curWidth);
							}
						});
					});
			});
		}).then(function () {
			//resizeTable();
		});
	} else {
		loadViews(pet, loadListForm);
	}
}

function headerClassAndName(pet, $e) {
	var cl = $e.attr("class"),
	mo = cl.match(new RegExp(pet + "-([^ ]+)"));
	if (mo) return mo;
	console.log("Error on:", $e, cl);
	return [null, null];
}

function toggleColumn() {
	var $this = $(this), $col = $(".pet-list-table-pane ." + $this.data("class"));
	if ($col.is(":visible")) {
		$col.hide();
	} else {
		$col.show();
		resizeTable($col);
	}
}

function resizeTable($col) {
	if ($col) {
		var maxWidth = 0;
		$col.each(function () {
			$(this).css("width", "auto");
			maxWidth = Math.max(maxWidth, $(this).width());
		})
		.width(maxWidth);
		console.log(maxWidth);
	} else {
		$(".pet-list-table-header span").each(function () {
			resizeTable($("." + $(this).data("class")));
		})
	}
}