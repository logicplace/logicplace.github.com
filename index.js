$(function() {
	ModLinks(".menu");

	LoadPage(window.location.search.substr(1));
});

function LoadMe() {
	LoadPage($(this).attr("href").substr(1));
}

function LoadPage(page) {
	$("#meat").load((page || "index_content") + ".html", function() {
		ModLinks();
	});
}

function ModLinks(base) {
	$(base || "#meat").find("a.loadpage").each(function(idx, elem) {
		var $elem = $(elem), href = $elem.attr("href");
		if (href[0] == "/") {
			$elem.attr("href", "?" + href.substr(1, href.length - 6));
		} else if (!href.match(/^https?:\/\//) && href[0] != "?") {
			var search = window.location.search.substr(1);
			if (search && search[search.length - 1] != "/") search += "/";
			$elem.attr("href", "?" + search + href);
		}
		$elem.click(LoadMe);
	});
}

function waitFor(wait, callback) {
	var result;
	switch (typeof(wait)) {
		case "function":
			result = wait();
			break;
		case "object":
			result = true;
			for (var i = 0; i < wait.length; i++) {
				result = result && (wait[i] in window) && typeof(window[wait[i]]) !== "undefined";
			}
			break;
		case "string":
			result = eval(wait);
			break;
		default:
			console.log("Unknown wait type", wait)
	}
	if (result) callback();
	else {
		setTimeout(function () {
			waitFor(wait, callback);
		}, 50);
	}
}
