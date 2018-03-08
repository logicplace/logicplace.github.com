function DataBase(prefix) {
	this.prefix = prefix;
	this.cache = {};

	var entries = this.entries = JSON.parse(localStorage.getItem(this.prefix + ";entries") || "[]");
	var entrySet = this.entrySet = {};

	for (var i = entries.length; i--;) {
		entrySet[entries[i]] = true;
	}
}

/*** METHODS ***/
(function () {
	/**** PRIVATE METHODS ****/
	function isArray(x) {
		return x && x.constructor && x.constructor.name == "Array";
	}

	function insert(self, value) {
		if (self.schema) {
			if (value && typeof value == "object") {
				var ids = self.schema.id, id = new Array(ids.length);
				for (var i = ids.length; i--;) {
					var key = ids[i];
					if (key in value) {
						id[i] = value[key];
					}
					else {
						console.error("Object missing required ID part", key);
						return 0;
					}
				}

				self.put(id, value);
				return 1;
			}
			else {
				console.error("Cannot insert value into schematized DB", value);
				return 0;
			}
		}
		else {
			console.error("Cannot use insert on a non-schematized DB");
			return 0;
		}
	}

	function updateEntries(self) {
		if (self.updateEntriesTimer) clearTimeout(self.updateEntriesTimer);
		self.updateEntriesTimer = setTimeout(function () {
			self.entries.sort();
			localStorage.setItem(self.prefix + ";entries", JSON.stringify(self.entries));
		}, 500);
	}

	/**** PUBLIC METHODS ****/
	var public = {
		"sub": function (prefix) {
			return new DataBase(this.prefix + "/" + prefix);
		},

		"primary": function (primary) {
			if (!this.schema) this.schema = {};

			if (isArray(primary)) {
				this.schema.id = primary.slice();
			}
			else {
				this.schema.id = [primary];
			}

			return this;
		},

		"get": function (key, def) {
			if (isArray(key)) {
				key = key.join("/");
			}

			if (key in this.cache) {
				return this.cache[key];
			}
			else {
				var res = localStorage.getItem(this.prefix + ":" + key);
				if (res === null) {
					return def;
				}
				else {
					res = JSON.parse(res);
					this.cache[key] = res;
					return res;
				}
			}
		},

		"put": function (key, value) {
			if (isArray(key)) {
				key = key.join("/");
			}

			this.cache[key] = value;
			localStorage.setItem(this.prefix + ":" + key, JSON.stringify(value));

			if (!(key in this.entrySet)) {
				this.entrySet[key] = true;
				this.entries.push(key);
				updateEntries(this);
			}
		},

		"insert": function (value) {
			if (isArray(value)) {
				var ret = 0;
				for (var i = value.length; i--;) {
					ret += insert(this, value[i]);
				}
				return ret;
			}

			return insert(this, value);
		},

		"remove": function (key) {
			if (isArray(key)) {
				key = key.join("/");
			}

			delete this.cache[key];
			localStorage.removeItem(key);

			if (key in this.entrySet) {
				delete this.entrySet[key];

				var idx = this.entries.indexOf(key);
				if (idx >= 0) {
					this.entries.splice(idx, 1);
				}

				updateEntries(this);
			}
		},

		"clear": function (key) {
			if (isArray(key)) {
				key = key.join("/");
			}

			if (0 in arguments) {
				delete this.cache[key];
			}
			else {
				this.cache = {};
			}
		},

		"each": function (handler) {
			var entries = this.entries;
			for (var i = entries.length; i--;) {
				handler(this.get(entries[i]));
			}
		},
	};
	for (var name in public) {
		Object.defineProperty(DataBase.prototype, name, {
			"enumerable": false,
			"value": public[name],
		});
	}
})();
