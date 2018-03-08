var BASE_URL = "/tools/pet/";

var PETS = []
var BASE_PETS = {}
var PET_DBS = {}
var PET_HANDLERS = {}

var BASE_DB;
waitFor(["DataBase"], function () {
	BASE_DB = new DataBase("MegaMan");
	setTimeout(update, 100);
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

				var processing = 0;

				function subProcessing() {
					--processing;
					if (processing == 0) {
						$(".loading-pane").addClass("hidden");
						$(".home-pane").removeClass("hidden");
					}
				}

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

									petDB.releases.insert(release);

									json.releases.push(region);
								}

								// Update DB entry.
								petDB.chips.insert(json);

								subProcessing();
							},

							"failure": function () {
								console.error("Failed to download update for " + fn_path);
								// TODO: Reason
								subProcessing();
							},
						});
					}
					else {
						subProcessing();
					}
				}

				for(var filename in updated) {
					++processing;
					processResult(PET_DBS[pet].chips.get(filename, {
						"filename": filename,
					}));
				}
			},

			"failure": function () {
				console.error("Failed to download update list.");
				// TODO: Reason
			},
		});
	}

	forAllPets(_, callback);
}

var FORMS = {};
function loadViews(pet, callback) {
	console.log("Downloading views for", pet);
	$.ajax({
		"url": BASE_URL + pet + ".html",

		"success": function (html) {
			console.log("Successfully downloaded views for", pet);
			var html = $.parseHTML(html), views = {};
			for (var i = html.length - 1; i >= 0; i--) {
				var $node = $(html[i]),
				view = ($node.attr("class") || "").match("pet-([^\-]+)-view");
				if (view) {
					// http://stackoverflow.com/questions/27841112
					$node.find("*").contents().filter(function() {
						return this.nodeType == Node.TEXT_NODE && !/\S/.test(this.nodeValue);
					}).remove();

					var $target = $node.find("." + view[0]);
					if ($target.length == 1) {
						$node = $target;
					}

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

function loadChipForm(pet, filename, region) {
	if (pet in FORMS) {
		if ($(".form-pane").show().find(FORMS[pet].chip.attr("class").replace(/(^| +)/g, "$1.")).length == 0) {
			$(".home-pane").hide();
			$(".form-pane").empty().append(FORMS[pet].chip);
		}
		
		var petDB = PET_DBS[pet];
		var chip = petDB.chips.get(filename);
		if (chip) {
			var release = petDB.releases.get([filename, region]);
			if(release) {
				PET_HANDLERS[pet].chip($(".pet-chip-view"), chip, release);
			} else {
				PET_HANDLERS[pet].chipFail();
			}
		} else {
			PET_HANDLERS[pet].chipFail();
		}
	} else {
		loadViews(pet, function () {
			loadChipForm(pet, filename, region);
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

		// Use header to create settings
		var $visibility = $("<div>").addClass("pet-list-setting pet-list-visibility"),
		$visEntry = $("<span>").append(
			$('<input type="checkbox">'),
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

			var $input = $copy.find("input");
			if ($this.hasClass("default")) {
				$input.prop("checked", true);
			}
			$input.click(toggleColumn);

			$copy.find("label").addClass("local-pet-" + cl[1]);
			$visibility.append($copy);
		});
		$(".pet-list-settings-pane").empty().append($visibility);
				
		// TODO: resizeable?
		$(".pet-list-table-header").empty().append($header.children());

		// Create row template
		$LIST_ROW = FORMS[pet].row.clone().addClass("pet-list-table-row");
		$LIST_ROW.children().each(function () {
			$(this).removeClass("default required sortable");
		});

		$(".list-view").show();

		var petDB = PET_DBS[pet], $table = $(".pet-list-table-rows").empty();

		var selector = selectChipRow(pet);

		petDB.chips.each(function (chip) {
			var releases = chip.releases

			for (var i = releases.length; i--;) {
				var release = petDB.releases.get([chip.filename, releases[i]]);

				var $row = $LIST_ROW.clone()
					.click(selector)
					.data({
						"filename": chip.filename,
						"region": releases[i],
					});
				PET_HANDLERS[pet].createRow($row, release, chip);
				$row.find(hideClass).hide();
				$table.append($row);
			}
		});

		sortByColumn.call($(".pet-list-table-header .local-pet-number"));
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

function selectChipRow(pet) {
	return function () {
		var $this = $(this);

		$(".pet-list-table-row.selected").removeClass("selected");
		$this.addClass("selected");

		loadChipForm(pet, $this.data("filename"), $this.data("region"));
	}
}

function toggleColumn() {
	var $this = $(this), $col = $(".pet-list-table-pane ." + $this.parent().data("class"));
	if ($col.is(":visible")) {
		$col.hide();
	} else {
		$col.show();
	}
}

function sortByColumn() {
	var $colHead = $(this);

	var descending = !!$colHead.data("descending");
	var cls = $colHead.attr("class").split(" ", 1)[0];

	var $rows = $(".pet-list-table-row");

	$rows.sort(function (a, b) {
		var aMember = a.getElementsByClassName(cls)[0];
		var bMember = b.getElementsByClassName(cls)[0];

		if (aMember && bMember) {
			var aText = aMember.innerText, bText = bMember.innerText;
			var aNum = parseInt(aText), bNum = parseInt(bText);

			var aNaN = isNaN(aNum), bNaN = isNaN(bNum);

			var res;
			if (aNaN || bNaN) {
				// ASCII-betical sort.
				res = aText.localeCompare(bText);
			}
			else {
				// Numerical sort.
				res = aNum - bNum;
			}

			return descending ? -res : res;
		}
		// Force non-existent entries to the bottom.
		else if (aMember) {
			return -1;
		}
		else if (bMember) {
			return 1;
		}
		else {
			return 0;
		}
	});

	$rows.detach().appendTo(".pet-list-table-rows");
}
