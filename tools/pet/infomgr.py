#!/usr/bin/env python3
#-*- coding:utf-8 -*-

# Copyright 2016 Sapphire Becker (logicplace.com)
# MIT Licensed

import os, sys, argparse, configparser
import re
import JSLON
import readline
import traceback
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

def refAndLastIndex(obj, key, data, elm, reraise=False):
	splits = elm.strip().split(":")
	ref, idx = None, None

	try:
		for sub in splits[::-1]:
			if ref is not None: ref, idx = None, ref[idx]

			dots = sub.split(".")

			if len(dots) == 1 and idx is None:
				# Take it as a string.
				idx = dots[0]
				if idx[0] == "$": idx = key.group(int(idx[1:]))
			else:
				subRef, subIdx = None, None
				if dots[0] == "data":
					subRef = data
					dots.pop(0)
				else: subRef = obj

				for dot in dots:
					if subIdx is not None: subRef = subRef[subIdx]
					if dot[0] == "$": dot = key.group(int(dot[1:]))
					subIdx = dot
				#endfor

				if idx is None: ref, idx = subRef, subIdx
				else: ref = subRef[subIdx]
			#endif
		#endfor
	except KeyError:
		if reraise: raise
		error("Failed indexing %s at %s" % (elm, idx if subIdx is None else subIdx))
		return None, None
	#endtry

	if ref is None:
		if idx is None: return None
		elif idx == "data": return data, None
		else: return obj, idx
	else: return ref, idx
#enddef		

def lookupIndexing(obj, key, data, elm):
	ref, idx = refAndLastIndex(obj, key, data, elm)
	try:
		if idx is None: return ref
		else: return ref[idx]
	except KeyError:
		error("Failed indexing %s at %s" % (elm, idx))
		return None
	#endtry
#enddef

def updateIndexing(obj, key, data, elm, val):
	ref, idx = refAndLastIndex(obj, key, data, elm)
	if idx is None:
		error("Cannot update " + elm + ": Invalid assignment")
	else: ref[idx] = val
#enddef

def deleteIndexing(obj, key, data, elm):
	ref, idx = refAndLastIndex(obj, key, data, elm)
	if idx is None:
		error("Cannot update " + elm + ": Invalid assignment")
	else: del ref[idx]
#enddef

def hasIndexing(obj, key, data, elm):
	try:
		ref, idx = refAndLastIndex(obj, key, data, elm, True)
		if idx is not None: ref[idx]
		return True
	except KeyError:
		return False
	#endtry
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
		help="Sort object keys according to given list of given files/regex (see -q).")
	parser.add_argument("-u", "--updated", default="",
		help="Write out when the files/regex (see -q) were last updated to the given file.")
	parser.add_argument("-h", "-?", "--help", action="store_true",
		help=argparse.SUPPRESS)
	parser.add_argument("files", nargs="*",
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

	# Use the provided file(s)/regex or request one.
	files, regexs = [], []
	if args.files:
		for x in args.files:
			if x[0:3] != "re:": files.append((x, None))
			else: regexs.append(re.compile(x[3:] + "$"))
	elif args.query_files or args.sort_objects or args.updated:
		regexs.append(re.compile(input("Enter a file regex: ") + "$"))
	#endif

	if regexs:
		for root, dirs, fns in os.walk("."):
			root = root[2:] # delete ./
			for fn in fns:
				fn = os.path.join(root, fn)
				for r in regexs:
					mo = r.match(fn)
					if mo:
						files.append((fn, mo))
						break
					#endif
				#endfor
			#endfor
		#endfor
	#endif

	files = sorted(list(set(files)))

	if args.generate_adv:
		en = re.compile("^[a-zA-Z0-9 \-+]+$")
		cp = re.compile("^CP [0-9]+$")
		blank = re.compile("^\(blank\)$")
		isIcon = re.compile("^icon$")
		isBack = re.compile("^(.*) \(back\)$")

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
				("class",    None),
				("cp",       None),
				("at",       None),
				("element",  None),
				("field",    None),
				("effect",   None),
				("icon",     None),
				("pins",     None),
				("notes",    ""),
				("releases", {}),
			]))

			for name, fn in names:
				# What language is this name? Can assume "CP", blank, EN, or JP.
				back = isBack.match(name)
				if back: name = back.group(1)

				if cp.match(name):
					language = "cp"
					json["cp"] = int(name[3:])
				elif en.match(name):
					language = "en"
				elif blank.match(name):
					language = "blank"
				elif isIcon.match(name):
					json.icon = fn
					continue
				else:
					language = "jp"
				#endif

				if language not in json["releases"]:
					json["releases"][language] = odict([
						("name", name),
						("set", None),
						("front", {
							"image": None,
							"credits": None,
						}),
						("back", {
							"image": None,
							"credits": None,
						}),
						("official", True),
						("notes", ""),
					])
				#endif
				json["releases"][language]["back" if back else "front"]["image"] = fn
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
		if not files: return error("No files found or selected.", 6)

		full = odict()
		for x, mo in files:
			root, ext = os.path.splitext(x)
			f = open(x, "r")
			full[root] = (JSLON.parse(f.read(), {"dict": odict}), mo)
			f.close()
		#endfor

		wSet, wData, trace = None, None, None

		while True:
			try:
				cmds = input("cmd: ").split("then")
				for cmdIdx, cmd in enumerate(cmds):
					if not cmd: continue
					cmd, *arg = cmd.split(maxsplit=1)
					cmd = cmd.lower()
					if arg: arg = arg[0].strip()

					if cmd in ["help", "h", "?"]:
						print(
							"Query system help\n"
							"Commands:\n"
							" * exit - Quit querying\n"
							" * grab - Add list of space-separated filenames to the set."
							" * find - Enter an expression that returns a boolean, finds all entries (returns filename)\n"
							" * summ - Enter an expression, returns result for all entires\n"
							" * info - Enter a filename, displays all info. When linked, no argument is given\n"
							" * stat - Show current counts: files, matched set, summed data\n"
							" * clr  - Unset current links: all (default), set, or data\n"
							" * has  - Enter an index, finds all files that have this index.\n"
							" * cmpl - Inverts matched set.\n"
							" * set  - Enter an index and an expression, updates all matched or all files.\n"
							" * del  - Enter an index, deletes from all matched or all files.\n"
							" * save - Commit all matched or all files to disk.\n"
							" * load - Reload all matched or all files from disk.\n"
							"Command Suffixes:\n"
							" * nothing - Print the result and clear any links.\n"
							" * * - Links the result with the next command.\n"
							" * ! - Print the result but don't clear the previous link.\n"
							" * *! - Don't print or clear anything.\n"
							"One-line Joiners:\n"
							" * then - Acts as * on one line."
						)
					elif cmd in ["exit", "quit"]:
						return 0
					elif cmd in ["clear", "clr"]:
						wSet, wData = None, None
					elif cmd:
						cont, carry = False, False
						if cmd[-1] == "*": cmd, cont = cmd[:-1], True
						if cmd[-1] == "!": cmd, carry = cmd[:-1], True
						if cmdIdx < len(cmds) - 1: cont = True
						doprint = not cont

						if cmd == "find":
							nSet = []
							if wData is not None:
								for fn, data in wData.items():
									res = parseTransformation(arg, full[fn][0], full[fn][1], data)
									if type(res) is not bool:
										error("Result of %s was not bool.")
									elif res: nSet.append(fn)
								#endfor
								if not carry: wData = None
							elif wSet is not None:
								for fn in wSet:
									res = parseTransformation(arg, full[fn][0], full[fn][1], None)
									if type(res) is not bool:
										error("Result of %s was not bool.")
									elif res: nSet.append(fn)
								#endfor
								if not carry: wSet = None
							else:
								for fn, (json, key) in full.items():
									res = parseTransformation(arg, json, key, None)
									if type(res) is not bool:
										error("Result of %s was not bool.")
									elif res: nSet.append(fn)
								#endfor
							#endif

							if cont and not carry: wSet = nSet
							elif doprint:
								for fn in nSet: print("%s" % fn)
							#endif

						elif cmd == "info":
							if wSet is not None:
								for fn in wSet:
									print("=============== %s ===============" % fn)
									print(JSLON.stringify(full[fn][0], jslonFormat) + "\n")
								#endfor
								if not cont or carry: wSet = None
							else:
								if arg not in full:
									error("Filename does not exist (did you add .json??)")
									continue
								print(JSLON.stringify(full[arg][0], jslonFormat) + "\n\n")
							#endif

						elif cmd == "summ":
							nData = odict()
							if wData is not None:
								for fn, data in wData.items():
									res = parseTransformation(arg, full[fn][0], full[fn][1], data)
									if res is not None: nData[fn] = res
								#endfor
								if not carry: wData = None
							elif wSet is not None:
								for fn in wSet:
									res = parseTransformation(arg, full[fn][0], full[fn][1], None)
									if res is not None: nData[fn] = res
								#endfor
								if not carry: wSet = None
							else:
								for fn, (json, key) in full.items():
									res = parseTransformation(arg, json, key, None)
									if res is not None: nData[fn] = res
								#endfor
							#endif

							if cont and not carry: wData = nData
							elif doprint:
								for item in nData.items(): print("%s: %s" % item)
							#endif

						elif cmd in ["clr", "clear"]:
							arg = arg.lower()
							if arg == "data": wData = None
							elif arg == "set": wSet = None
							elif arg == "all": wData, wSet = None, None

						elif cmd == "test":
							fn, trans = arg.split(maxsplit=1)
							json, key = full[fn]
							print(parseTransformation(trans, wSet or json, key, wData))

						elif cmd == "stat":
							print("file count: %i; set count: %s; data count: %s" % (
								len(full),
								"null" if wSet is None else len(wSet),
								"null" if wData is None else len(wData),
							))

						elif cmd == "has":
							nSet = []
							if wData is not None:
								for fn, data in wData.items():
									if hasIndexing(full[fn][0], full[fn][1], data, arg):
										nSet.append(fn)
									#endif
								#endfor
								if not carry: wData = None
							elif wSet is not None:
								for fn in wSet:
									if hasIndexing(full[fn][0], full[fn][1], None, arg):
										nSet.append(fn)
									#endif
								#endfor
								if not carry: wSet = None
							else:
								for fn, (json, key) in full.items():
									if hasIndexing(json, key, None, arg):
										nSet.append(fn)
									#endif
								#endfor
							#endif

							if cont and not carry: wSet = nSet
							elif doprint:
								for fn in nSet: print("%s" % fn)
							#endif

						elif cmd in ["not", "neg", "cmpl"]:
							nSet = []
							if wSet:
								for fn in full.keys():
									if fn not in wSet: nSet.append(fn)
								#endfor
								if not carry: wSet = None
							else:
								error("No matched set.")
							#endif

							if cont and not carry: wSet = nSet
							elif doprint:
								for fn in nSet: print("%s" % fn)
							#endif

						elif cmd == "del":
							if wData is not None:
								for fn, data in wData.items():
									deleteIndexing(full[fn][0], full[fn][1], data, arg)
								#endfor
								if not carry: wData = None
							elif wSet is not None:
								for fn in wSet:
									deleteIndexing(full[fn][0], full[fn][1], None, arg)
								#endfor
								if not carry: wSet = None
							else:
								for fn, (json, key) in full.items():
									deleteIndexing(json, key, None, arg)
								#endfor
							#endif

						elif cmd == "set":
							index, trans = arg.split(maxsplit=1)
							updata = index == "data"

							if wData is not None:
								for fn, data in wData.items():
									res = parseTransformation(trans, full[fn][0], full[fn][1], data)
									if updata: wData[fn] = res
									else: updateIndexing(full[fn][0], full[fn][1], data, index, res)
									if doprint: print("%s: %s = %s" % (fn, index, repr(res)))
								#endfor
								if not carry and not updata: wData = None
							elif wSet is not None:
								if updata: wData = odict()
								for fn in wSet:
									res = parseTransformation(trans, full[fn][0], full[fn][1], None)
									if updata: wData[fn] = res
									else: updateIndexing(full[fn][0], full[fn][1], None, index, res)
									if doprint: print("%s: %s = %s" % (fn, index, repr(res)))
								#endforindex
								if not carry: wSet = None
							else:
								if updata: wData = odict()
								for fn, (json, key) in full.items():
									res = parseTransformation(trans, json, key, None)
									if updata: wData[fn] = res
									else: updateIndexing(json, key, None, index, res)
									if doprint: print("%s: %s = %s" % (fn, index, repr(res)))
								#endfor
							#endif

						elif cmd in ["obj", "+obj"]:
							updata = arg == "data"

							if wData:
								for fn, data in wData.items():
									if updata: wData[fn] = {}
									else: updateIndexing(full[fn][0], full[fn][1], data, arg, {})
									if doprint: print("%s: %s = {}" % (fn, arg))
								#endfor
								if not carry and not updata: wData = None
							elif wSet:
								if updata: wData = odict()
								for fn in wSet:
									if updata: wData[fn] = res
									else: updateIndexing(full[fn][0], full[fn][1], None, arg, {})
									if doprint: print("%s: %s = {}" % (fn, arg))
								#endforindex
								if not carry: wSet = None
							else:
								if updata: wData = odict()
								for fn, (json, key) in full.items():
									if updata: wData[fn] = res
									else: updateIndexing(json, key, None, arg, {})
									if doprint: print("%s: %s = {}" % (fn, arg))
								#endfor
							#endif

						elif cmd == "save":
							if wData: it = wData.keys()
							elif wSet: it = wSet
							else: it = full.keys()

							for fn in it:
								filename = full[fn][1].group(0)
								writeJSON(open(filename, "w"), full[fn][0])
								if doprint: print("%s: Saved to %s" % (fn, filename))
							#endfor
							
							if not carry:
								wData = None
								wSet = None
							#endif

						elif cmd == "load":
							# TODO: load new files
							if wData: it = wData.keys()
							elif wSet: it = wSet
							else: it = full.keys()

							for fn in it:
								filename = full[fn][1].group(0)
								f = open(filename, "r")
								full[fn] = (JSLON.parse(f.read(), {"dict": odict}), full[fn][1])
								f.close()
								if doprint: print("%s: Loaded from %s" % (fn, filename))
							#endfor

						elif cmd == "grab":
							if wSet is None: wSet = []
							for fn in arg.split():
								if fn in full: wSet.append(fn)
								else: error("No file %s." % fn)
							#endfor
							wSet = list(sorted(set(wSet)))

						elif cmd == "tb":
							traceback.print_tb(trace)

						else:
							error("Unknown command %s" % cmd)
							if cmdIdx < len(cmds) - 1: print("Canceling execution.")
							break
						#endif
					#endif
				#endfor
			except Exception as err:
				error("Command raised exception %s: %s" % (err.__class__.__name__, ' '.join(map(str, err.args))))
				trace = sys.exc_info()[2]
			#endtry
		#endwhile
	elif args.sort_objects:
		if not files: return error("No files found or selected.", 6)

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

		for fn, key in files:
			newfile, json = openJSON(fn, odict())
			writeJSON(newfile, recurse(json))
		#endfor
	elif args.updated:
		if not files: return error("No files found or selected.", 6)

		f = open(args.updated, "w")
		json = odict()
		for fn, key in files:
			stat = os.stat(fn)
			json[(key.group(1, None) if key and len(key.groups()) > 1 else None) or fn] = int(stat.st_mtime)
		#endfor
		writeJSON(f, json)
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
