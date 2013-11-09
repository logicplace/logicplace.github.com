window.onload = function(){
	var groups = document.getElementsByTagName("g"),here;
	for(var i=0;i<groups.length;++i){
		//groups[i].addEventListener("mouseover",GroupHover);
		//groups[i].addEventListener("mouseout",GroupNoHover);
		groups[i].onmouseover = GroupHover;
		groups[i].onmouseout = GroupNoHover;
		var chr = ["(",")"],clr="black",bg="yellow";
		if(groups[i].hasAttribute("b")){chr = ["[","]"];clr="white";bg="blue";}
		else if(groups[i].hasAttribute("c")){chr = ["{","}"];clr="white";bg="green";}
		else if(groups[i].hasAttribute("s")){chr = ["&apos;","&apos;"];clr="white";bg="purple";}
		groups[i].innerHTML = chr[0]+groups[i].innerHTML+chr[1];
		groups[i].color = clr;
		groups[i].bgcolor = bg;
	}
	
	groups = document.getElementsByTagName("a");
	for(var i=0;i<groups.length;++i){
		if((here = groups[i].getAttribute("here"))){
			groups[i].setAttribute("name",here);
			groups[i].setAttribute("href","#"+here);
			groups[i].innerHTML = "#";
		}
	}
}

function GroupHover(e){
	var groups = this.getElementsByTagName("g");
	for(var i=0;i<groups.length;++i){
		if(groups[i].hovering)return false;
	}
	this.hovering = true;
	this.oldtext = this.style.color;
	this.oldcolor = this.style.backgroundColor;
	this.style.color = this.color;
	this.style.backgroundColor = this.bgcolor;
	//e.stopPropagation();
	return false;
}

function GroupNoHover(e){
	this.style.color = this.oldtext;
	this.style.backgroundColor = this.oldcolor;
	this.hovering = false;
}
