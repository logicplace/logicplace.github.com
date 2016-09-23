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
			$elem.attr("href", "?" + href.substr(1));
		} else if (!href.match(/^https?:\/\//) && href[0] != "?") {
			var search = window.location.search.substr(1);
			if (search && search[search.length - 1] != "/") search += "/";
			$elem.attr("href", "?" + search + href);
		}
		$elem.click(LoadMe);
	});
}
