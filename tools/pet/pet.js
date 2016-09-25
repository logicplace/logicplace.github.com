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
				callback();
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

function loadChipForm(pet, filename_region) {
	if (pet in FORMS) {
		if ($(".form-pane").find(FORMS[pet].chip.attr("class").replace(/(^| +)/g, "$1.")).length == 0) {
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

function viewLoader(func) {
	var args = Array.prototype.slice.call(arguments, 1);
	return function () {
		func.apply(null, args);
	}
}