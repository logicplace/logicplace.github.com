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
		$(elem).click(LoadMe);
	});
}
