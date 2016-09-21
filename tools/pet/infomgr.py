#!/usr/bin/env python3
#-*- coding:utf-8 -*-

# Copyright 2016 Sapphire Becker (logicplace.com)
# MIT Licensed

import os, sys, argparse, configparser
import re
import JSLON
import readline
from collections import OrderedDict as odict

def error(error, code=None):
	if code is None: error = "WARNING: " + error
	else: error = "ERROR: " + error
	sys.stderr.write(error + "\n")
	return code
#enddef

def openJSON(filename, default):
	try:
		newfile = open(filename, "x")
	except FileExistsError:
		newfile = open(filename, "r")
		json = JSLON.parse(newfile.read(), {"dict": odict})
		newfile.close()
		newfile = open(filename, "w")
	else:
		json = default
	#endtry
	return newfile, json
#enddef

jslonFormat = {
	"entriesPerLine": 1,
	"openOwnLine": True,
	"endOwnLine": True,
	"spaceAfterKey": True,
}
def writeJSON(newfile, json):
	newfile.write(JSLON.stringify(json, jslonFormat))
	newfile.close()
#enddef

transformationFormat = re.compile(
	r'(\{|\}|,|=>|==|!=|is|null|true|false)|'  # Tokens and reserved words
	r'(-?[0-9]+)|'                             # Match a integer literal
	r'\$([0-9])|'                              # Match single digit group
	r'\$\{([^}]+)\}|'                          # Match multi-digit group
	r'((?:[a-zA-Z0-9_$.]+:)*[a-zA-Z0-9_$.]+)|' # Match an indexing sequence
	r"'([^']*)'|"                              # Match a string literal
	r'/(\\.|[^/]*)/'                           # Match a regex
)

def lookupIndexing(obj, key, data, elm):
	splits = elm.split(":")
	idx = splits.pop() if len(splits) > 1 else None
	y = None
	try:
		for x in splits[::-1]:
			try: idx = int(idx)
			except (ValueError, TypeError): pass
			dots = x.split(".")

			if dots[0] == "data":
				sub = data
				dots.pop(0)
			else: sub = obj

			for y in dots:
				if y[0] == "$": y = key.group(int(y[1:]))

				sub = sub[y]
			#endfor
			y = None
			if idx is None: idx = sub
			else: idx = sub[idx]
		#endfor
	except KeyError:
		error("Failed indexing %s at %s" % (elm, idx if y is None else y))
		return None
	return idx
#enddef

def parseTransformation(trans, obj, key, data, makeIter=True):
	cur, comp, mapping, mapmo = [], None, 0, None
	itr = transformationFormat.finditer(trans) if makeIter else trans
	for x in itr:
		token, num, sdg, mdg, elm, sqs, res = x.groups()
		regex = res is not None
		nothing = False

		# Fast-forward to end of map
		if mapping & 0x20:
			if token == "}": mapping = 0
			continue
		#endif

		if elm:
			thing = lookupIndexing(obj, key, data, elm)
		elif num:
			thing = int(num)
		elif sdg or mdg:
			thing = (mapmo if mapping & 0x10 else key).group(int(sdg or mdg))
		elif sqs is not None:
			thing = sqs
		elif regex:
			thing = res
		elif token == "null":
			thing = None
		elif token == "true":
			thing = True
		elif token == "false":
			thing = False
		else:
			nothing = True
		#endif

		eb = (x.start(), x.group(0))

		if comp:
			if nothing: raise SyntaxError("At %i: %s invalid RHS for comp." % eb)

			# Compare cur to thing and set to cur
			if comp == "is":
				cur = ["".join(map(str, cur))]
				comp = "=="
			if regex:
				tf = bool(re.search(thing, str(cur[-1])))
				if comp == "==": cur[-1] = tf
				elif comp == "!=": cur[-1] = not tf
			else:
				if comp == "==": cur[-1] = cur[-1] == thing
				elif comp == "!=": cur[-1] = cur[-1] != thing
			#endif
		elif mapping:
			if mapping & 2:
				if token == "=>": mapping ^= 6
				else: raise SyntaxError("Expected => at %i got %s" % eb)
				continue
			elif mapping & 8:
				if token == "}":
					mapping = 0
				elif token == ",":
					if mapping & 0x10: mapping = 0x20
					else: mapping = 1
				elif mapping & 0x10:
					if nothing:
						raise SyntaxError("Token in bad place. %i %s" % eb)
					elif regex:
						raise SyntaxError("Regex not allowed here. %i %s" % eb)
					else:
						cur.append(thing)
					#endif
				#endif
				continue
			#endif

			if nothing: raise SyntaxError("Expected content at %i, found %s." % eb)

			if mapping & 1:
				# Check for equality
				if regex:
					mapmo = re.search(thing, cur[-1])
					if mapmo: mapping |= 0x90
				elif cur[-1] == thing: mapping |= 0x90
				mapping ^= 3
			elif mapping & 0x80:
				# If cur is equal to the LHS, then store thing in cur and skip the rest of the map
				if regex: raise SyntaxError("Regex not allowed here. %i %s" % eb)
				cur[-1] = thing
				mapping = 0x18
			else:
				mapping = 8
			#endif
		elif nothing:
			if token == "{":
				mapping = 1
			elif token in ["==", "!=", "is"]:
				comp = token
			else:
				raise SyntaxError("Token in bad place. %i %s" % eb)
			#endif
		else:
			if regex: raise SyntaxError("Regex not allowed here. %i %s" % eb)
			cur.append(thing)
		#endif
	#endfor
	if len(cur) == 1: return cur[0]
	elif cur: return ''.join(map(str, cur))
#enddef

keyFormat = re.compile(r'^[a-zA-Z0-9_]+$')

def recurseObject(trans, obj, key, data):
	try: trans.items
	except AttributeError:
		if type(trans) is str:
			return parseTransformation(trans, obj, key, data)
		elif type(trans) is list:
			return [recurseObject(x, obj, key, data) for x in trans]
		else:
			return trans
		#endif
	else:
		return odict([
			(k if keyFormat.match(k) else recurseObject(k, obj, key, data),
			recurseObject(v, obj, key, data))
			for k, v in trans.items()
		])
	#endtry
#enddef

def main(args):
	parser = argparse.ArgumentParser(
		description="Manage Megaman PET chip data files.",
		add_help=False,
	)
	parser.add_argument("-a", "--generate-adv", action="store_true",
		help="Generate any missing JSON files in Advance PET format using images in CWD.")
	parser.add_argument("-j", "--translate-json", default="",
		help="Translate JSON structure to appropriate chip structures. See -h -j for details.")
	parser.add_argument("-m", "--merge-mode", default="new",
		help="When translating, specify the mode for merging; either new or overwrite.")
	parser.add_argument("-q", "--query-files", action="store_true",
		help="Query a set of JSON files using translation syntax. You may pass any number of files or a regex prefixed with re:")
	parser.add_argument("-s", "--sort-objects", default="",
		help="Sort object keys according to given list.")
	parser.add_argument("-h", "-?", "--help", action="store_true",
		help=argparse.SUPPRESS)
	parser.add_argument("optionals", nargs="*",
		help=argparse.SUPPRESS)
	
	args = parser.parse_args(args)

	if args.help:
		if args.generate_adv:
			print(
				"Image names are expected to be of the form #-Name.xxx\n"
				"The extension is ignored except that JSON files are filtered out."
			)
		elif args.translate_json:
			print(
				"Create a file with JSON formatted data contained in an object.\n"
				"This object must contain a _format key which describes the transformation."
				"This key must contain an object that has the form "
				"\"key regex\": [filename transformation, transformation] "
				"or \"key regex\": { \"_filename\": transformation, transformations... }\n"
				"where transformation is: an object whose keys are literal and whose "
				"values are transformations, a literal value (number, boolean, or null), "
				"or a string that describes the transformation. A literal string can be represented "
				"as \"'string contents'\"\n"
				"The syntax allows for indexing, comparisons, and mapping.\n"
				"Indexing is a sequence of symbols separated by colons.\n"
				"The symbol 'data' is a reserved word that refers to the data in the matched key.\n"
				"You may refer to groups in the key with $#. $0 is the key itself.\n"
				"If the first symbol is a word, it refers to a key in the struct you're transforming.\n"
				"Comparisons may use: ==, !=, is\n"
				"Mapping is of the form: symbol { from => to, ... }\n"
			)
		else:
			parser.print_help()
		#endif
		return 0
	#endif

	if args.generate_adv:
		en = re.compile("^[a-zA-Z0-9 \-+]+$")
		cp = re.compile("^CP [0-9]+$")
		createable = {}
		for fn in os.listdir("."):
			# Make sure this isn't a JSON file.
			if fn[-5:].lower() == ".json": continue

			# Now check if it's a chip image.
			if "." not in fn: continue
			try:
				num, name = fn.split("-")
				int(num)
				name, ext = name.rsplit(".", 1)
				if name[-6:] == " (bad)": name = name[:-6]
			except ValueError: continue

			if num not in createable: createable[num] = []
			createable[num].append((name, fn))
			print(num, name, ext)
		#endfor

		for num, names in createable.items():
			# Okay! Create/update the JSON file.
			newfile, json = openJSON("%s.json" % num, odict([
				("type",     None),
				("cp",       None),
				("at",       None),
				("element",  None),
				("field",    None),
				("pins",     None),
				("notes",    ""),
				("releases", {}),
			]))

			for name, fn in names:
				# What language is this name? Can assume "CP", EN, or JP.
				if cp.match(name):
					language = "cp"
					json["cp"] = int(name[3:])
				elif en.match(name):
					language = "en"
				else:
					language = "jp"
				#endif

				if language not in json["releases"]:
					json["releases"][language] = odict([
						("name", name),
						("set", None),
						("image", fn),
						("official", True),
						("notes", ""),
					])
				#endif
			#endfor

			writeJSON(newfile, json)
		#endfor
	elif args.translate_json:
		with open(args.translate_json, "r") as f:
			json = JSLON.parse(f.read(), {"dict": odict})
			form = []

			for x, t in json["_format"].items():
				try: "_filename" in t
				except TypeError:
					if len(t) != 2: return error("Filename not provided for key: " + x, 2)
				else:
					t = [t["_filename"], t]
					del t[1]["_filename"]
				#endtry
				t = (list(transformationFormat.finditer(t[0])), t[1])
				form.append((re.compile("^" + x + "$"), t))
			#endfor
			del json["_format"]

			for key, data in json.items():
				doBreak = False
				for r, (fn, t) in form:
					mo = r.match(key)
					if mo:
						try:
							# Get the filename
							fn = parseTransformation(fn, json, mo, data, False)
						except SyntaxError as err:
							return error("Error processing filename for %s: %s" % (r.pattern[1:-1], err.args[0]), 3)
						#endtry

						newfile, result = openJSON(fn, odict())
						try:
							# Perform this translation
							obj = recurseObject(t, json, mo, data)
						except SyntaxError as err:
							return error("Error processing data for %s: %s" % (r.pattern[1:-1], err.args[0]), 4)
						#endtry

						def recursiveMergeOverwrite(json, obj, path=""):
							for k, v in obj.items():
								if k in json and json[k]:
									newPath = (path + "." if path else "") + k
									try: json[k].items
									except AttributeError:
										error("Overwriting %s: %s" % (newPath, json[k]))
										json[k] = v
									else: recursiveMergeOverwrite(json[k], v, newPath)
								else:
									json[k] = v
								#endif
							#endfor
						#enddef

						def recursiveMergeNew(json, obj):
							for k, v in obj.items():
								if k not in json or json[k] is None: json[k] = v
								elif json[k] == "" and type(v) is str: json[k] = v
								else:
									try: json[k].items
									except AttributeError: pass
									else: recursiveMergeNew(json[k], v)
								#endif
							#endfor
						#enddef

						recursiveMerge = {
							"new": recursiveMergeNew,
							"over": recursiveMergeOverwrite,
							"overwrite": recursiveMergeOverwrite,
						}

						try: recursiveMerge[args.merge_mode]
						except KeyError:
							return error("Merge mode not found.", 17)
						else: recursiveMerge[args.merge_mode](result, obj)
						writeJSON(newfile, result)
						print("Wrote file " + fn)
						break
					#endif
				#endfor
			#endfor
		#endwith
	elif args.query_files:
		# Use the provided file(s)/regex or request one.
		files, regexs = [], []
		if args.optionals:
			for x in args.optionals:
				if x[0:3] != "re:": files.append((x, None))
				else: regexs.append(re.compile(x[3:] + "$"))
		else: regexs.append(re.compile(input("Enter a file regex: ") + "$"))

		for fn in os.listdir("."):
			for r in regexs:
				mo = r.match(fn)
				if mo:
					files.append((fn, mo))
					break
				#endif
			#endfor
		#endfor

		files = sorted(list(set(files)))

		if not files: return error("No files found or selected.", 6)

		full = odict()
		for x, mo in files:
			root, ext = os.path.splitext(x)
			f = open(x, "r")
			full[root] = (JSLON.parse(f.read(), {"dict": odict}), mo)
			f.close()
		#endfor

		wSet, wData = None, None

		while True:
			try:
				cmd = input("cmd: ")
				if cmd in ["help", "h", "?"]:
					print(
						"Query system help\n"
						"Commands:\n"
						" * exit - Quit querying\n"
						" * find - Enter an expression that returns a boolean, finds all entries (returns filename)\n"
						" * info - Enter a filename, displays all info. When linked, no argument is given\n"
						" * summ - Enter an expression, returns result for all entires\n"
						"If you follow the command name with a * you may link the result with the next command."
					)
				elif cmd in ["exit", "quit"]:
					return 0
				elif cmd in ["clear", "clr"]:
					wSet, wData = None, None
				elif cmd:
					(cmd, arg), cont = (cmd.split(maxsplit=1) + ["", ""])[0:2], False
					if cmd[-1] == "*": cmd, cont = cmd[:-1], True

					if cmd == "find":
						nSet = []
						if wData:
							for fn, data in wData.items():
								res = parseTransformation(arg, full[fn][0], full[fn][1], data)
								if type(res) is not bool:
									error("Result of %s was not bool.")
								elif res: nSet.append(fn)
							#endfor
							wData = None
						elif wSet:
							for fn in wSet:
								res = parseTransformation(arg, full[fn][0], full[fn][1], None)
								if type(res) is not bool:
									error("Result of %s was not bool.")
								elif res: nSet.append(fn)
							#endfor
							wSet = None
						else:
							for fn, (json, key) in full.items():
								res = parseTransformation(arg, json, key, None)
								if type(res) is not bool:
									error("Result of %s was not bool.")
								elif res: nSet.append(fn)
							#endfor
						#endif

						if cont: wSet = nSet
						else:
							for fn in nSet: print("%s" % fn)
						#endif
					elif cmd == "info":
						if wSet:
							for fn in wSet:
								print("=============== %s ===============" % fn)
								print(JSLON.stringify(full[fn], jslonFormat) + "\n")
							#endfor
							if not cont: wSet = None
						else:
							if arg not in full:
								error("Filename does not exist (did you add .json??)")
								continue
							print(JSLON.stringify(full[arg], jslonFormat) + "\n\n")
						#endif
					elif cmd == "summ":
						nData = odict()
						if wData:
							for fn, data in wData.items():
								res = parseTransformation(arg, full[fn][0], full[fn][1], data)
								if res is not None: nData[fn] = res
							#endfor
							wData = None
						elif wSet:
							for fn in wSet:
								res = parseTransformation(arg, full[fn][0], full[fn][1], None)
								if res is not None: nData[fn] = res
							#endfor
							wSet = None
						else:
							for fn, (json, key) in full.items():
								res = parseTransformation(arg, json, key, None)
								if res is not None: nData[fn] = res
							#endfor
						#endif

						if cont: wData = nData
						else:
							for item in nData.items(): print("%s: %s" % item)
						#endif
					elif cmd == "test":
						fn, trans = arg.split(maxsplit=1)
						json, key = full[fn]
						print(parseTransformation(trans, wSet or json, key, wData))
					elif cmd == "stat":
						print("file count: %i; wSet count: %s; wData count: %s" % (
							len(full),
							"null" if wSet is None else len(wSet),
							"null" if wData is None else len(wData),
						))
					#endif
				#endif
			except Exception as err:
				error("Command raised exception: " + str(err))
			#endtry
		#endwhile
	elif args.sort_objects:
		order = args.sort_objects.split(",")
		warned = set()

		def sorter(x):
			x = x[0]
			try: return order.index(x)
			except ValueError:
				if x not in warned:
					error("No sort order defined for key " + x)
					warned.add(x)
				#endif
				return len(order)
			#endtry
		#enddef

		def recurse(x):
			x = sorted(x.items(), key=sorter)
			for i, (k, v) in enumerate(x):
				try: v.items
				except AttributeError: pass
				else: x[i] = (k, recurse(v))
			#endfor
			return odict(x)
		#enddef

		for x in args.optionals:
			newfile, json = openJSON(x, odict())
			writeJSON(newfile, recurse(json))
		#endfor
	#endif

	return 0
#enddef

if __name__ == "__main__":
	historyfile = os.path.expanduser("~/.history-infomgr")
	try: readline.read_history_file(historyfile)
	except FileNotFoundError: pass
	try: ret = main(sys.argv[1:])
	except (KeyboardInterrupt, EOFError):
		print("\nProgram terminated by user.")
		ret = 0
	#endtry
	readline.write_history_file(historyfile)
	sys.exit(ret)
#endif
